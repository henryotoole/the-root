/*
	untether_list.js

	This is a very simple service which provides a lightweight mobile way to take, view, and edit notes.
	@license Copyright (C) 2017  Joshua Reed
	This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

//sp_content and sp_local are both path specifiers from the server.
function init(sp_content, sp_local)
{
	console.log("Global init (untether_list.js).");
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

//This class handles global page-wide operations
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
	static get query_url() {return "/untether/query";};		//Query data url
	
	//Loads a project by ID
	load_note(id)
	{
		if(id == this.iface_active.note_id)
		{
			return;
		}
		this.active_project_id = id;
		var note = this.nav.notes[id];
		this.get_nonactive_interface().load(note.id, note.name, function()
		{
			console.log("activating project interface for project " + PAGE.get_nonactive_interface().note_id);
			PAGE.ifaceActivate(PAGE.get_nonactive_interface());
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
		var _this = this;
		
		
		this.$root = $("#nav_list_region");
		this.$add_cont = $('#add_container');
		this.$add_box = $('#add_box');
		this.$add_words = $('#add_words');
		this.$add_cross = $('#add_cross');
		this.categories = {}; //[id] -> id, name, $dom, $reg
		this.notes = {}; //[id] -> id, name, $dom
		
		var ttime = 200; //Transition time millis
		
		this.$add_cont.hover(function()
		{
			_this.$add_box.finish().animate({'width': '95%'}, ttime, function()
			{
				_this.$add_words.finish().show(0);
				_this.$add_cross.finish().hide(0);
			});
		}, function()
		{
			_this.$add_box.finish().animate({'width': '40px'}, ttime);
			_this.$add_words.finish().hide(0);
			_this.$add_cross.finish().show(0);
		});
		this.$add_cont.click(function()
		{
			location.href = '/note/n/unnamed'
		});
		
		this.make_categories();
		this.load();
	}
	
	//Populates the navigation sidebar with all of the users notes.
	load()
	{
		var _this = this;
		$.getJSON(Page.query_url + "/user_notes")
			.done(function(list)
			{
				for(var i = 0; i < list.length; i++)
				{
					var note = list[i];
					var $parent = _this.categories[note.cat] ? _this.categories[note.cat].$reg : _this.$root;
					_this.add_note(note.id, $parent, note.name);
				}
			});
	}
	
	//Populates categories with all categories in the table.
	make_categories()
	{
		var _this = this;
		$.getJSON(Page.query_url + "/user_cats").done(function(list)
		{
			for(var i = 0; i < list.length; i++)
			{
				var cat = list[i];
				//For now, only top-level categories are allowed. Nested categories are built into the db, however, and will be added later
				_this.add_category(cat.id, _this.$root, cat.name);
			}
		});
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
	add_note(id, $category, name)
	{
		//Check for ID match.
		if(this.notes[id])
		{
			return; //The ID already exists.
		}
		
		var $circle = $("<div></div>").addClass("circle-small");
		var $name = $("<div>" + name + "</div>").addClass("note-entry-name").addClass("f-playfair-para");
		var $entry = $("<div></div>").addClass("note-entry").addClass("org-row-left").append($circle).append($name).click(function()
		{
			PAGE.load_note(id);
		});
		$category.prepend($entry);
		this.notes[id] = {id: id, $dom: $entry, name: name}
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
		this.$title = $dom.find('#title').first();
		this.$text = $dom.find('#text').first();
		this.$edit = $dom.find('#edit').first();
		this.$del = $dom.find('#delete').first();
		this.note_id = null;
		this.active = false;
	}
	
	//Loads a note from the specified url into this interface. The callback is fired when it loads.
	load(note_id, name, callback)
	{
		var _callback = callback;
		var _this = this;
		this.note_id = note_id;
		this.$title.html(name);
		$.post(Page.query_url + "/note_get", {'id': note_id}).done(function(data)
		{
			console.log("GETTING TEXT");
			console.log(data.text);
			_this.$text.html(data.text.replace(/(?:\r\n|\r|\n)/g, '<br />'));
			_callback();
		});
		this.$del.click(function()
		{
			$.post(Page.query_url + "/note_del", {'id': _this.note_id}).done(function(data)
			{
				console.log("Deleted");
				//TODO Clear page
			});
		});
		this.$edit.click(function()
		{
			location.href = "/note/e/" + PAGE.nav.notes[note_id].name;
		});
	}
}