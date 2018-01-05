/*
	untether_edit.js

	This is a very simple service which provides a lightweight mobile way to take, view, and edit notes.
	@license Copyright (C) 2017  Joshua Reed
	This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

//sp_content and sp_local are both path specifiers from the server.
//Name is unique to the untether edit, and it referrs to the name of the note we are editing (this can also be pulled from the url)
//Type referes to whether the url is /e/note or /n/note. Will be 'new' or 'edit'
function init(sp_content, sp_local, name, type)
{
	console.log("Global init (untether_edit.js).");
	//initalize page. This is the global reference which we will call upon throughout the code.
	console.log("Using content root: " + sp_content);
	console.log("Using local root: " + sp_local);
	SP_LOCAL = sp_local;
	SP_CONTENT = sp_content;
	NAME = name;
	TYPE = type;
	console.log('Name: ' + NAME);
	
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
	PAGE = new Page()
}

class Page
{
	//A general note about the function of this page.
	//There are three ways this page can be loaded: NEW, RENAME, and LOAD
	//For NEW, the url is /note/n/name. This causes a new note to be created on the server. The page is then reloaded to /note/e/name,
	//	which causes the page to reload via LOAD
	//For RENAME, the title input has been changed during and edit. This also causes a new note to be created on the server. As in
	//	via NEW, this new note will have a unique name (possible xxxxx (n)). However, for a RENAME the text of the 'old' note will
	//	be written to the new note and the old note will be deleted.
	//Lastly, a LOAD is called every time the page loads with /note/e/name. It simply tries to load whatever the name is. If none
	//	exists, a new one of that name will be created in edit mode.
	
	constructor()
	{
		var _this = this;
		this.$title = $('#e_title');
		this.$text = $('#e_text');
		this.$cc1 = $('#cc1');
		this.$cc2 = $('#cc2');
		this.$cc3 = $('#cc3');
		
		this.prev_text = ""; //Used to compare if the text has changed.
		this.title = NAME; //Used to compare if the title has changed.
		this.id = null; //The ID of this note. Can be undefined, in which case a new note should be created on save.
		this.starred = 0; //True if there's a star in the tab title.
		
		this.$title.change(function(){_this.title_change(); _this.save_title($(this).val());}).keydown(function(){_this.title_change();});
		this.$text.change(function(){_this.textarea_change();}).keydown(function(){_this.textarea_change();});
		$(window).resize(function ()
		{
			//Note, this can be called continuously or at the end of a resize, depending on browser.
			PAGE.onResize();
		});
		this.onResize();
		this.title_change();
		this.load_text(NAME);
		
		//Autosave feature
		setInterval(function() {_this.autosave();}, 3000);
	}
	
	//Called when the window resizes
	onResize()
	{
		
	}
	
	load_text(name)
	{
		if(TYPE == 'new') {return;} // Don't load if we are in 'new' mode
		
		var _this = this;
		//NOTE: This should never be reached for a 'new' note because the URL will reload to 'edit' upon a title selection.
		$.post("/untether/query/note_info", {'name': name}).done(function(data) //Note exists
		{
			console.log("Got info: ")
			console.log(data);
			_this.save_title(data.name);
			_this.id = data.id;
			$.post("/untether/query/note_get", {'id': data.id}).done(function(data)
			{
				_this.set_text(data.text);
			});
		}).fail(function() //Note doesn't exist, so create a new empty one
		{
			$.post("/untether/query/note_make", {'name': name}).done(function(data)
			{
				_this.save_title(data.name);
				_this.id = data.id;
				console.log("New note created and ready for editing.")
			});
		});
	}
	
	//Saves the text, and only the text. Title updates are handled differently.
	//If the ID is not defined (this.id), then a new note will be created and the title/id updated accordingly
	save_text()
	{
		if(TYPE == 'new') {return;} // Don't save if we are waiting for the user to input a title.
		
		console.log("Saving");
		var _this = this;
		if(this.id)
		{
			$.post("/untether/query/note_set", {'id': this.id, 'text': this.get_text()}).done(function()
			{
				console.log("Text save successful");
				_this.update_savestar(1);
			});
		}
		else //This really shouldn't ever be called.
		{
			console.log("SHOULDN'T BE HERE");
		}
	}
	
	//If the title has changed, change the URL (page reload) and update records on the server.
	save_title(title)
	{
		var _this = this;
		if(TYPE == 'new') //If we are making a new one, create a new note before switching to it.
		{
			//NEW
			$.post("/untether/query/note_make", {'name': title}).done(function(data)
			{
				//Load the new note.
				location.href = "/note/e/" + data.name;
			});
		}
		else
		{
			//RENAME
			if(this.title != title) //If we are editing and the title is changed
			{
				console.log('Changing title to ' + title);
				//Create a new note with the same text.
				$.post("/untether/query/note_make", {'name': title, 'text': this.get_text()}).done(function(data)
				{
					console.log("Made new note")
					var new_name = data.name;
					//Delete the old one
					$.post("/untether/query/note_del", {'id': _this.id}).done(function()
					{
						console.log("Deleteing nold one, redirecting");
						location.href = "/note/e/" + new_name;
					});
				});
			}
		}
	}
	
	//Will loop once every second, saving the text if something has changed.
	autosave()
	{
		//Check if the TEXT has changed. Title changes are effected on detection.
		var t = this.get_text();
		if(t != this.prev_text || this.starred)
		{
			this.prev_text = t;
			this.save_text();
		}
	}
	
	//Called whenever there's a change in the title input. Causes the title block to size itself correctly.
	title_change()
	{
		var cont = this.$title.val();
		var size = cont.length < 10 ? 10 : cont.length;
		console.log(size);
		this.$title.attr('size', size);
		
		this.update_savestar(0);
	}
	
	//If safe, then the page has been 'saved' and should not indicate unsaved changes.
	update_savestar(safe)
	{
		$('title').html((safe ? '' : '*') + this.title);
		this.starred = !safe;
	}
	
	//Called whenever there's a change in the text area text.
	textarea_change()
	{
		this.update_savestar(0);
	}
	
	//Gets the TEXT as an escaped string.
	get_text()
	{
		return escape(this.$text.val());
	}
	
	//Sets the text. The input is assumed to be an escaped string from the server.
	set_text(text)
	{
		this.$text.val(unescape(text));
	}
}