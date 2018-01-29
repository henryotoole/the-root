/*
	untether_list.js

	This is a very simple service which provides a lightweight mobile way to take, view, and edit notes.
	@license Copyright (C) 2017  Joshua Reed
	This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

//sp_content and sp_local are both path specifiers from the server.
function init(sp_local, sp_content, sp_webvsn)
{
	console.log("Global init (untether_list.js).");
	//initalize page. This is the global reference which we will call upon throughout the code.
	console.log("Using content root: " + sp_content);
	console.log("Using local root: " + sp_local);
	SP_CONTENT = sp_content; //Refrence to the root (leading slash) of the content director: .../.../content
	SP_LOCAL = sp_local; // .../static/luxedo
	SP_WEBVSN = sp_webvsn;
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
	
	//Simply shifts the active iface off screen.
	ifaceDeactivateCurrent()
	{
		this.iface_active.position(Interface.STATUS.below);
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
		
		
		this.$root = $("#nav_list_region"); //List DOM for non-categorized notes.
		this.$root_cat = $('#nav_list_region_cat'); //List DOM for categories
		this.$add_cont = $('#add_container');
		this.$add_box = $('#add_box');
		this.$add_words = $('#add_words');
		this.$add_cross = $('#add_cross');
		this.$new_sel_overlay = $('#new_sel_overlay');
		this.$new_sel_title = $('#new_item_name');
		this.$new_note = $('#new_note');
		this.$new_cat = $('#new_cat');
		this.$greyout = $('#greyout');
		this.$new_cat_name = $('#new_item_catname');
		this.$new_cat_submit = $('#new_cat_submit');
		this.$new_item_cat = $('#new_item_cat');
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
			_this.$new_sel_overlay.finish().show();
			_this.$greyout.finish().show();
			_this.$new_sel_title.html('New Item');
			_this.$new_cat.finish().show();
			_this.$new_note.finish().show();
			_this.$new_item_cat.finish().hide();
		});
		this.$new_cat.click(function()
		{
			_this.$new_cat.finish().hide();
			_this.$new_note.finish().hide();
			_this.$new_item_cat.finish().show();
			_this.$new_sel_title.html('New Category');
		});
		this.$new_cat_submit.click(function()
		{
			_this.create_category(_this.$new_cat_name.val());
			_this.$new_sel_overlay.finish().hide();
			_this.$greyout.finish().hide();
		});
		this.$new_note.click(function()
		{
			location.href = '/note/n/unnamed'
		});
		this.$root.bind('drop', function(e)
		{
			e.preventDefault(); e.stopPropagation();
			$(this).removeClass('sel-highlight-bg');
			_this.move_note(e.originalEvent.dataTransfer.getData("id"), null);
		}).bind('dragenter', function(e) {
			e.preventDefault(); e.stopPropagation();
			_this.dtgtroot = e.target;
			$(this).addClass('sel-highlight-bg');
		}).bind('dragover', function(e) {e.preventDefault(); e.stopPropagation(); console.log("REG dragover");}) //Needed so drop will work
		.bind('dragleave', function(e) {
			e.preventDefault(); e.stopPropagation();
			if(_this.dtgtroot === e.target) //Ensure a child isn't calling dragleave
			{
				$(this).removeClass('sel-highlight-bg');
				_this.dtgtroot = null;
			}
		});
		//Escape key pressed.
		$(document).keyup(function(e) {
			if (e.keyCode == 27) {
				_this.$new_sel_overlay.finish().hide();
				_this.$greyout.finish().hide();
			}
		});
		this.load();
	}
	
	//Populates the navigation sidebar with all of the users notes.
	load()
	{
		var _this = this;
		$.getJSON(Page.query_url + "/user_cats").done(function(list)
		{
			for(var i = 0; i < list.length; i++)
			{
				var cat = list[i];
				//For now, only top-level categories are allowed. Nested categories are built into the db, however, and will be added later
				_this.add_category(cat.id, _this.$root_cat, cat.name);
			}
			$.getJSON(Page.query_url + "/user_notes")
			//Add notes once all categories have been added.
			.done(function(list)
			{
				for(var i = 0; i < list.length; i++)
				{
					var note = list[i];
					_this.add_note(note.id, note.cat, note.name);
				}
			});
		});
	}
	
	//Creates a new category via AJAX to server and then adds it via add_category
	create_category(name)
	{
		var _this = this;
		if(name == "") {return;} //Dont' create unnamed categories.
		$.getJSON(Page.query_url + "/cat_create", {'name': name})
			.done(function(json)
			{
				console.log(json);
				_this.add_category(json.id, _this.$root, json.name);
			});
	}
	
	//Adds a category to the project navigation. As long as each one has a unique ID, they can be nested.
	//id: 		unique ID for this category
	//$parent: 	a reference to the parent dom which this will be under. For root use Page.$nav_categories
	//Note: If an ID has already been added a new one will NOT be added.
	add_category(id, $parent, name)
	{
		//Check for ID match.
		var _this = this;
		if(this.categories[id])
		{
			return; //The ID already exists.
		}
		var $circle = $("<div></div>").addClass("circle-medium");
		var $name = $("<div>" + name + "</div>").addClass("cat-entry-name").addClass("f-playfair-subhead");
		var $reg = $("<div></div>").addClass("cat-entry-subregion").bind('drop', function(e)
			{
				e.preventDefault(); e.stopPropagation();
				$(this).removeClass('sel-highlight-bg');
				_this.move_note(e.originalEvent.dataTransfer.getData("id"), id);
			}).bind('dragenter', function(e) {
				e.preventDefault(); e.stopPropagation();
				_this.categories[id].dtgtreg = e.target;
				$(this).addClass('sel-highlight-bg');
			}).bind('dragover', function(e) {e.preventDefault(); e.stopPropagation(); console.log("REG dragover");}) //Needed so drop will work
			.bind('dragleave', function(e) {
				e.preventDefault(); e.stopPropagation();
				if(_this.categories[id].dtgtreg === e.target) //Ensure a child isn't calling dragleave
				{
					$(this).removeClass('sel-highlight-bg');
					_this.categories[id].dtgtreg = null;
				}
			});
		var $lgroup = $("<div></div>").addClass("org-row-left").append($circle).append($name);
		var $rename = $("<div></div>").addClass("unt-catbtn").addClass("hover-grey")
			.append($("<img src='" + SP_LOCAL + "/icons/feather.svg?web_vsn=" + SP_WEBVSN + "' width='100%' height='100%'>")).click(function(e)
			{
				e.stopPropagation();
			});
		var $delete = $("<div></div>").addClass("unt-catbtn").addClass("hover-red")
			.append($("<img src='" + SP_LOCAL + "/icons/fire.svg?web_vsn=" + SP_WEBVSN + "' width='100%' height='100%'>")).click(function(e)
			{
				e.stopPropagation();
				if(confirm("Are you sure you want to delete the '" + name + "' category? All contained notes will be deleted as well."))
				{
					//Delete all notes in this category.
					for(var x = 0; x < _this.notes.length; x++)
					{
						if(_this.notes[x].cat_id && _this.notes[x].cat_id == id)
						{
							_this.del_note(x);
						}
					}
					_this.del_cat(id);
				}
			});
		var $rgroup = $("<div></div>").addClass("org-row-spaced").css({'float': 'right', 'display': 'none'}).append($rename).append($delete);
		var $top = $("<div></div>").addClass("cat-entry-topgroup").append($lgroup).append($rgroup).click(function()	{
				$reg.finish().toggle(200);
				$circle.toggleClass("region-crosshatched");
			}).hover(function()	{
				$rgroup.finish().show();
			}, function() {
				$rgroup.finish().hide();
			}).bind('drop', function(e)
			{
				e.preventDefault(); e.stopPropagation();
				$(this).removeClass('sel-highlight-bg');
				console.log(e.originalEvent.dataTransfer.getData("id"));
				_this.move_note(e.originalEvent.dataTransfer.getData("id"), id);
			}).bind('dragenter', function(e) {
				e.preventDefault(); e.stopPropagation();
				_this.categories[id].dtgttop = e.target;
				$(this).addClass('sel-highlight-bg');
			}).bind('dragover', function(e) {e.preventDefault(); e.stopPropagation();}) //Needed so drop will work
			.bind('dragleave', function(e) {
				e.preventDefault(); e.stopPropagation();
				if(_this.categories[id].dtgttop === e.target) //Ensure a child isn't calling dragleave
				{
					$(this).removeClass('sel-highlight-bg');
					_this.categories[id].dtgtreg = null;
				}
			});
		var $entry = $("<div></div>").addClass("cat-entry").append($top).append($reg);
		$parent.prepend($entry);
		this.categories[id] = {id: id, $dom: $entry, $reg: $reg, name: name}
	}
	
	//Deletes the category of that ID from the server, client data, and dom
	del_cat(id)
	{
		var _this = this;
		if(this.categories[id])
		{
			$.getJSON(Page.query_url + "/cat_del", {'id': id})
				.done(function(json)
				{
					console.log("Deleted category on server. Removing from client data and visual...");
					_this.categories[id].$dom.remove();
					delete _this.categories[id];
				});
		}
	}
	
	//Adds a single project entry in a category.
	add_note(id, cat_id, name)
	{
		//Check for ID match.
		if(this.notes[id])
		{
			return; //The ID already exists.
		}
		var $category = this.categories[cat_id] ? this.categories[cat_id].$reg : this.$root;
		console.log("Adding note " + id + " to category " + cat_id);
		var $circle = $("<div></div>").addClass("circle-small");
		var $name = $("<div>" + name + "</div>").addClass("note-entry-name").addClass("f-playfair-para");
		var $entry = $("<div></div>").addClass("note-entry").addClass("org-row-left").append($circle).append($name)
			.attr('draggable', 'true').click(function()
			{
				PAGE.load_note(id);
			}).on('dragstart', function(e)
			{
				e.originalEvent.dataTransfer.setData("id", id);
			});
		$category.prepend($entry);
		this.notes[id] = {id: id, cat_id: cat_id, $dom: $entry, name: name}
	}
	
	//Moves a note from one cat to the next. Effects server, client data, and visual
	move_note(id, new_cat_id)
	{
		var _this = this;
		console.log("Moving from " + this.notes[id].cat + " to " + new_cat_id);
		$.getJSON(Page.query_url + "/note_move", {'id': id, 'new_cat_id': new_cat_id})
			.done(function()
			{
				console.log("Move effected on server...");
				var $category = new_cat_id ? _this.categories[new_cat_id].$reg : _this.$root;
				console.log($category);
				var new_note = _this.notes[id].$dom.clone(true);
				$category.prepend(new_note) // Copy the DOM
				_this.notes[id].$dom.remove(); //Remove the old DOM
				_this.notes[id].cat_id = new_cat_id; //Rebuild reference to cat ID
				_this.notes[id].$dom = new_note; //Rebuild reference to new DOM
			});
	}
	
	//Removes the note of the desired id from the server, client data, and visual.
	//Also loads the next note in the list, if the current note is loaded.
	del_note(id)
	{
		var _this = this;
		$.post(Page.query_url + "/note_del", {'id': id}).done(function(data)
		{
			console.log("Deleted note on server. Removing from client data and visual...");
			var keys = Object.keys(_this.notes);
			var next_id = -1;
			for (var x = 0; x < keys.length; x++)
			{
				if(parseInt(keys[x]) == parseInt(id)) //If we find the right key, get the next one if there is one.
				{
					if((x+1) < keys.length)
					{
						next_id = keys[x+1];
					}
					else if(x-1 >= 0)
					{
						next_id = keys[x-1];
					}
				}
			}
			_this.notes[id].$dom.remove(); //Remove from list.
			if(PAGE.iface_active.note_id == id)
			{
				PAGE.load
			}
			delete _this.notes[id];
			if(next_id > -1)
			{
				PAGE.load_note(next_id);
			}
			else
			{
				PAGE.ifaceDeactivateCurrent();
			}
		});
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
			_this.$text.html(unescape(data.text).replace(/(?:\r\n|\r|\n)/g, '<br />'));
			_callback();
		});
		this.$del.click(function()
		{
			PAGE.nav.del_note(_this.note_id);
		});
		this.$edit.click(function()
		{
			location.href = "/note/e/" + PAGE.nav.notes[note_id].name;
		});
	}
}