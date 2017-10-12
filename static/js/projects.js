//projects.js
//A general purpose project information viewer. The lefthand of the project page is a nav bar type thing which
//stays in place. The righthand portion of the page (most of the page) is a region where different absolute divs
//can slide up and down. These divs will be loaded ad-hoc and contain project information.

//sp_content and sp_local are both path specifiers from the server.
function init(sp_content, sp_local)
{
	console.log("Global init.");
	//initalize page. This is the global reference which we will call upon throughout the code.
	console.log("Using content root: " + sp_content);
	console.log("Using local root: " + sp_local);
	SP_CONTENT = sp_content; //Refrence to the root (leading slash) of the content director: .../.../content
	SP_LOCAL = sp_local; // .../static/luxedo
	PAGE = new Page();
	PAGE.initialize();
	//If any ajax request returns an error, this is triggered.
	$(document).ajaxError(function(event, jqxhr, settings, thrownError)
	{
		console.log("===========XHR ERROR===========")
		console.log(jqxhr.status + ": " + jqxhr.responseText)
		console.log("===============================")
	});
	$.ajaxSetup({
		//Disable caching for projects. If a project is updated it will not show up even if the file name
		//changes due to caching. It's a pain, and we disable it here. This isn't exactly enterprise level
		//work, so who cares about performance.
		cache: false
	});
}

//############################################################################
//########################-------Page Class-------############################
//############################################################################
//This class handles global page-wide operations, such as
class Page
{
	constructor()
	{
		//There will only be two project frames, the one showing and the one not.
		//This allows for pre-loading, smooth slide, and for the expansion to project caching in the future.
		this.proj_initial = new Interface($('proj_initial'), null); //A dummy interface which shows up on pageload only.
		this.proj_one = new InterfaceProject($('#proj_active')); //The first project frame
		this.proj_two = new InterfaceProject($('#proj_other')); //The other project frame
		this.nav = new Navigation();
	}

	//Sets up the page upon page load. This method is nececssary so we can call certain methods
	//after setting the global PAGE reference, as many functions in this file reference it.
	initialize()
	{
		//Position all objects on page.
		this.proj_one.position(Interface.STATUS.offscreen);
		this.proj_two.position(Interface.STATUS.offscreen);
		this.proj_initial.position(Interface.STATUS.active);
		this.iface_active = this.proj_initial;
	}
	
	//A 'static' variable.
	static get query_url() {return "/projects/query";};		//Requests for workspace data (device, canvas, etc)
	
	//Loads a project by ID
	load_project(id)
	{
		if(id == this.iface_active.proj_id)
		{
			return;
		}
		this.active_project_id = id;
		var proj = this.nav.projects[id];
		this.get_nonactive_interface().load(proj.id, proj.url, function()
		{
			console.log("activating project interface for project " + PAGE.get_nonactive_interface().proj_id);
			PAGE.ifaceActivate(PAGE.get_nonactive_interface());
			window.location.hash = proj.id;
		}); //Begin loading project, with a callback to activate this iframe when we are done.
	}
	
	//Simply gets the interface that's not active.
	get_nonactive_interface()
	{
		if(this.proj_one.active)
		{
			return this.proj_two;
		}
		return this.proj_one;
	}

	//Activates the provided interface
	ifaceActivate(iface)
	{
		iface.active = true;
		//Effect visual transition
		this.iface_active.transition(iface);
		//Set old iface to inactive
		this.iface_active.active = false;
		//Set new active
		this.iface_active = iface;
		//Set this controls toolbar entry as selected, and remove the previous selection
		//TODO this part
	}

	//Called when page resizes
	onResize()
	{
		//Scale the active interface to fit the new page size.
		this.iface_active.position(Interface.STATUS.active);
	}
}

//The navigation bar on the left.
class Navigation
{
	constructor()
	{
		this.category_preload = [
			["mech", "Mechanical Projects"],
			["code", "Coding Projects"]
		];
		this.$root = $("#nav_list_region");
		this.categories = {}; //[id] -> id, name, $dom, $reg
		this.projects = {}; //[id] -> id, name, $dom
		
		
		this.make_categories();
		this.load();
	}
	
	//Populates the navigation sidebar with project metadata from the server.
	load()
	{
		var _this = this;
		$.getJSON(Page.query_url + "/project_meta_all")
			.done(function(list)
			{
				for(var i = 0; i < list.length; i++) //Add all canvases to skins interface.
				{
					var proj = list[i];
					console.log(proj);
					_this.add_project(proj.proj_id, _this.categories[proj.cat_id].$reg, proj.proj_name, SP_CONTENT + proj.url);
				}
				//If a hash exists in the url, load it here.
				var hash = window.location.hash;
				if(hash)
				{
					hash = hash.substring(1, hash.length)
					console.log(hash);
					PAGE.load_project(hash);
				}
			});
	}
	
	//Populates categories with a hard-coded list. In the future this will be done with AJAX
	make_categories()
	{
		for(var x = 0; x < this.category_preload.length; x++)
		{
			var cat = this.category_preload[x];
			this.add_category(cat[0], this.$root, cat[1]);
		}
	}
	
	//Adds a category to the project navigation. As long as each one has a unique ID, they can be nested.
	//id: 		unique ID for this category
	//$parent: 	a reference to the parent dom which this will be under. For root use Page.$nav_categories
	//Note: If an ID has already been added a new one will NOT be added.
	add_category(id, $parent, name)
	{
		//Check for ID match.
		if(this.categories[id])
		{
			return; //The ID already exists.
		}
		var $circle = $("<div></div>").addClass("circle-small");
		var $name = $("<div>" + name + "</div>").addClass("cat-entry-name").addClass("f-playfair-subhead");
		var $reg = $("<div></div>").addClass("cat-entry-subregion");
		var $top = $("<div></div>").addClass("cat-entry-topgroup").append($circle).append($name).click(function()
		{
			$reg.finish().toggle(200);
		});
		var $entry = $("<div></div>").addClass("cat-entry").append($top).append($reg);
		$parent.append($entry);
		this.categories[id] = {id: id, $dom: $entry, $reg: $reg, name: name}
	}
	
	//Adds a single project entry in a category.
	add_project(id, $category, name, url)
	{
		//Check for ID match.
		if(this.projects[id])
		{
			return; //The ID already exists.
		}
		
		var $name = $("<div>" + name + "</div>").addClass("proj-entry-name").addClass("f-playfair-para");
		var $entry = $("<div></div>").addClass("proj-entry").append($name).click(function()
		{
			PAGE.load_project(id);
		});
		$category.append($entry);
		this.projects[id] = {id: id, $dom: $entry, name: name, url: url}
	}
}


//Anything that extends 'interface' can be easily shifted into and out of the loaded portion.
//It represents an absolutely positioned div of hard-coded heights and widths which has built-in
//functions which slide it into position.
class Interface
{
	/**
	 * @param  $dom           Reference to the actual div tag used for this interface.
	 * @param  $nav_header    Reference to the the object which they click to select this project so we can mark it so
	 */
	constructor($dom, $nav_header)
	{
		//The percent from top left corner of x and y for 'base' position
		this.rootx = 0.22;
		this.rooty = 0;
		//The percent width and height of the interface
		this.rootw = 1 - this.rootx;
		this.rooth =1.0;

		//The HTML DOM Object tied to the interface.
		this.$dom = $dom
		this.cds = this.getStatusCoords(Interface.STATUS.offscreen);
		this.$nav_header = $nav_header;
	}

	static get STATUS()
	{
		return {offscreen: 0, above: 1, below: 2, active: 3};
	}

	//Gets the top/left/width/height coords (in a dict) that the object 'should' currently
	//occupy. This is dependent on the passed status.
	getStatusCoords(stat)
	{
		var sh = window.innerHeight;
		var sw = window.innerWidth;
		var t = 0;
		var l = this.rootx * sw;
		var h = this.rooth * sh;
		var w = this.rootw * sw;

		if(stat == Interface.STATUS.offscreen)
		{
			l = -3000;
		}
		else if(stat == Interface.STATUS.above)
		{
			t = (this.rooty * sh) - sh;
		}
		else if(stat == Interface.STATUS.below)
		{
			t = (this.rooty * sh) + sh;
		}
		else if(stat == Interface.STATUS.active)
		{
			t = (this.rooty * sh);
		}

		return {top: t, left: l, width: w, height: h};
	}

	//Assumes this is the active interface (the one we transition *from*)
	//iface_next is the iface to transition *to*.
	//Callback is a callback function which tells the page that we've finished the translation.
	transition(iface_next)
	{
		var _this = this;
		//console.log('here' + callback);
		//Prep the new iface
		iface_next.position(Interface.STATUS.above);
		//Cue sliding animation.
		iface_next.$dom.finish().animate(
			iface_next.getStatusCoords(Interface.STATUS.active),
			'fast');
		console.log("Animating");
		this.$dom.finish().animate(
			this.getStatusCoords(Interface.STATUS.below),
			'fast');
		iface_next.onActivate();
		this.onDeactivate();
	}

	//just a hook function so the 'activated' interface can set itself up, if it wants.
	onActivate()
	{

	}

	onDeactivate()
	{

	}

	//Simply updates the size/coords of the object based off the supplied status.
	//i.e. sends the interface to the provided status location.
	position(stat)
	{
		//Get tlwh coords for this status
		this.cds = this.getStatusCoords(stat);
		//Instantly scale to match those coords
		this.$dom.offset({top: this.cds.top, left: this.cds.left}).width(this.cds.width).height(this.cds.height);
		this.onPosition(this.cds); //Hook for children
	}

	/**
	 * Called whenever the window resizes or a transition occurs. Handles scrollpane updates all across the page.
	 * @param  cds [array of top, left, width, and height coords for this position]
	 * @return nothing
	 */
	onPosition(cds)
	{
		var wiface = this.$dom.find('.scrollpane').width();
		//Only apply to scrollpanes which are children of this object.
		this.$dom.find('.scrollpane-grid').each(function(index)
		{
			var wtile = $(this).children().first().outerWidth(true);
			var n = Math.floor(wiface / wtile);
			$(this).width(n * wtile);
			$(this).css('min-width', wtile + "px")
			$(this).css('max-width', (n * wtile + 10) + "px")
		});
	}


}

//The general container interface for a standard project entry
//These are populated ad-hoc as projects are selected.
class InterfaceProject extends Interface
{
	
	//proj_id should be a string.
	constructor($dom)
	{
		super($dom, null);
		this.proj_id = null;
		this.active = false;
	}
	
	//Loads a project file (html) at the specified url into this interface. The callback is fired when it loads.
	load(proj_id, url, callback)
	{
		this.proj_id = proj_id;
		this.$dom.load(url);
		callback();
	}
}