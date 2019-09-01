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
		
		//Settings
		this.$greyout = $('#greyout');
		this.$settings_ovl = $('#settings_overlay').hide();
		this.$settings = $('#settings').click(function()
		{
			_this.$greyout.finish().show();
			_this.$settings_ovl.finish().show();
		});
		this.$encrypt_enable = $('#enable_encrypt').click(function()
		{
			$(this).toggleClass('checked');
			_this.toggle_encrypt();
		});
		this.$public_enable = $('#enable_public').click(function()
		{
			$(this).toggleClass('checked');
			_this.toggle_public();
		});
		this.encrypt_enable = 0; // Whether this document is encrypted.
		this.is_public = 0; // Whether this document is (read only) public.
		//Encryption Password
		this.$encpw_overlay = $('#encpw_overlay').hide();
		this.$encrypt_password = $('#encrypt_password');
		this.$encrypt_password_check = $('#encrypt_password_check');
		this.$encrypt_msg = $('#encrypt_message');
		this.$encpw_title = $('#encpw_title');
		this.$encpw_submit = $('#encpw_submit').click(function(){_this.password_encrypt();});

		this.$pub_url = $('#public_url');
		this.$pub_url_cont = $('#public_url_cont');

		this.enc_pass = "" // Set by password_encrypt()
		//Escape key pressed.
		$(document).keydown(function(e) {
			if (e.keyCode == 27) {
				_this.hide_overlays();
			}
			else if(e.ctrlKey && e.keyCode == 83)
			{
				e.preventDefault();
				e.stopPropagation();
				_this.save_text();
			}
		});
		
		//Autosave feature
		setInterval(function() {_this.autosave();}, 3000);
	}
	
	//Called when the window resizes
	onResize()
	{
		
	}
	
	//Called when the checkbox for 'encryption' is called.
	toggle_encrypt()
	{
		if(this.encrypt_enable) //Disable encryption
		{
			this.encrypt_enable = false;
		}
		else //Enable encryption
		{
			this.$settings_ovl.finish().hide();
			this.$encpw_overlay.finish().show();
			this.$encrypt_password_check.finish().show();
			//Note, we actually set the state var encrypt_enable upon the submit button of the two-password overlay.
		}
	}

	//Called when the user clicks the 'make public' checkbox in the settings.
	toggle_public()
	{
		this.is_public = !this.is_public;
		this.public_set_status_dom(this.is_public)
		$.post("/untether/query/note_set_public", {'id': this.id, 'status': (this.is_public ? 1 : 0)}).done(function(data)
		{
			console.log("Succesfully set public status on server.")
		});
	}

	//Sets the graphical dom stuff for public enable settings. Does not change server.
	public_set_status_dom(status)
	{
		if(status)
		{
			this.$public_enable.addClass('checked');
			this.$pub_url_cont.show();
			this.$pub_url.html(this.public_get_url());
		}
		else
		{
			this.$public_enable.removeClass('checked');
			this.$pub_url_cont.hide();
			this.$pub_url.html("");
		}
	}

	//Gets the public url for this note. All notes have a public url, whether the are actually accessible or not.
	public_get_url()
	{
		return this.public_url_base + this.id;
	}
	
	//Called when the user hits the 'submit' button in the encryption password overlay
	password_encrypt()
	{
		var pass = this.$encrypt_password.val();
		var passcheck = this.$encrypt_password_check.val();
		
		//Input checks.
		if(!pass)
		{
			this.$encrypt_msg.html("You must supply a password! Otherwise this whole 'encryption' deal gets alot less interesting...");
			
			return;
		}
		
		//Actual encryption/decryption
		if(this.encrypt_enable) // If encrypt is already enabled, then we are 'decoding'
		{
			var esc_plaintext = this.get_text(); //Must call this before encrypt_password is set.
			this.encrypt_password = pass; // Must call this before you use set_text (state-dependent)
			try
			{
				this.set_text(esc_plaintext);
			}
			catch(e)
			{
				//If this fails, it is probably an incorrect password.
				console.log("Probably an incorrect password, but there could well be other errors here.")
				this.$encrypt_msg.html("Incorrect password...");
				this.encrypt_password = ""; // This is important to stop a corrupting save with the incorrect password.
				return;
			}
			this.hide_overlays();
		}
		else // If it's not enabled, then we are setting up encryption for a plaintext file.
		{
			if(pass != passcheck) // Ensure both passwords match.
			{
				this.$encrypt_msg.html("Passwords do not match.");
				return;
			}
			this.encrypt_password = pass;
			this.encrypt_enable = true;
			//Setting these state vars will ensure that an encrypted version is saved.
		}
	}
	
	//Hides all overlays
	hide_overlays()
	{
		this.$settings_ovl.finish().hide();
		this.$greyout.finish().hide();
		this.$encpw_overlay.finish().hide();
		this.$encrypt_msg.html("");
	}
	
	//Called when the note loads. 'encrypted' is 0 for not, 1 for encrypted
	setup_encrypt(encrypted)
	{
		this.encrypt_enable = encrypted;
		this.encrypt_password = ""; // Initialize with blank password. This will be filled out by user actions later.
		if(encrypted)
		{
			this.$encrypt_enable.addClass('checked');
			//Ask for password
			this.$encrypt_password_check.finish().hide();
			this.$encpw_overlay.finish().show();
		}
		else
		{
			this.$encrypt_enable.removeClass('checked');
		}
	}
	
	//These two functions simply take a password and string as an argument, and return the
	//encrypted or unecrypted string.
	encrypt_text(plaintext, pass)
	{
		if(pass=="") {return plaintext;}
		//Remember, sjcl.encrypt actually returns a json object with a few pieces of metadata and the encoded string.
		return JSON.stringify(sjcl.encrypt(pass, plaintext));
	}
	
	//If no password is provided, simply return ciphertext.
	decrypt_text(ciphertext, pass)
	{
		if(pass=="") {return ciphertext;}
		console.log("Decrypting with: " + ciphertext);
		//Don't forget that decrypt actually expects a json object, not just ciphertext.
		return sjcl.decrypt(pass, JSON.parse(ciphertext));
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
			_this.setup_encrypt(data.enc == 'True');
			_this.public_url_base = data.public_url_base;
			_this.is_public = data.pub == 'True';
			_this.public_set_status_dom(_this.is_public);
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

	//Using encryption state values, get the escaped and (if it should) encrypted copy of the plaintext in the editor.
	//Remember, encrypt THEN escape is the right way.
	get_text()
	{
		var text = this.$text.val();
		if(this.encrypt_enable)
		{
			text = this.encrypt_text(text, this.encrypt_password);
		}
		return escape(text);
	}

	//Gets the raw text from the editor. Could be encrypted.
	get_pure_text()
	{
		return this.$text.val();
	}
	
	//Sets the plaintext editor text with the unescaped and (if the encryption state values call for it) unencrypted
	//provided character string. Remember, unescape THEN decrypt.
	set_text(in_text)
	{
		var text = unescape(in_text);
		if(this.encrypt_enable)
		{
			text = this.decrypt_text(text, this.encrypt_password);
		}
		this.$text.val(text);
	}
	
	//Saves the text, and only the text. Title updates are handled differently.
	//If the ID is not defined (this.id), then a new note will be created and the title/id updated accordingly.
	//All encryption/decryption is handled in get_text().
	save_text()
	{
		if(TYPE == 'new') {return;} // Don't save if we are waiting for the user to input a title.
		if(this.encrypt_enable && this.encrypt_password == "")
		{
			console.log("Not saving text because encryption is enabled but a password has not been supplied. This would corrupt the save.");
			return;
		}
		
		console.log("Saving");
		var _this = this;
		var data = {'id': this.id, 'text': this.get_text(), 'enc': (this.encrypt_enable ? 1 : 0)}
		if(this.id)
		{
			$.post("/untether/query/note_set", data).done(function()
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
		var t = this.get_pure_text();
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

}