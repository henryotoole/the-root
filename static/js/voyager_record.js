/*
	voyager.js

	This is a simple service which provides a way to archive and view adventure/travel ideas.
	@license Copyright (C) 2018  Joshua Reed
	This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

//sp_content and sp_local are both path specifiers from the server.
function init(sp_local, sp_content)
{
	console.log("Global init (untether_edit.js).");
	//initalize page. This is the global reference which we will call upon throughout the code.
	console.log("Using content root: " + sp_content);
	console.log("Using local root: " + sp_local);
	SP_LOCAL = sp_local;
	SP_CONTENT = sp_content;
	
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
		//cache: false
	});
	PAGE = new Page()
}

class Page
{
	//A general note about the function of this page.
	
	constructor()
	{
		$(window).resize(function ()
		{
			//Note, this can be called continuously or at the end of a resize, depending on browser.
			PAGE.onResize();
		});
		this.onResize();
		document.onpaste = this.on_paste;
		
		var _this = this;
		
		this.$loc_sel_reg = $('#loc_sel_reg');
		this.$loc_sel_map = $('#loc_sel_map');
		this.$loc_sel_cor = $('#loc_sel_cor');
		this.$loc_reg = $('#loc_reg');
		this.$loc_map = $('#loc_map');
		this.$loc_cor = $('#loc_cor');
		this.$enable_state_sel = $('#loc_reg_enable_state');
		this.$state_sel = $('#loc_reg_sel_state');
		this.$country_sel = $('#loc_reg_sel_country');
		this.$notes_enable = $('#enable_notes');
		this.$notes = $('#notes');
		this.$enable_images = $('#enable_images');
		this.$images = $('#images');
		this.$image_file_input = $('#image_input');
		this.$types = $('#types');
		this.$types_sel_opt = $('#types_sel_opt');
		this.$new_type = $('#new_type');
		this.$new_type_container = $('#new_type_container');
		this.$error = $('#error');
		this.$name = $('#name');
		$('#save').click(function() {PAGE.save();});
		
		this.images = {}; //Dictlist of image information : {arbitrary id: {$dom: dom, type: type, src: data}}
		this.arb_img_id = 0;
		
		this.$loc_sel_reg.click(function()
		{
			$(this).addClass('checked');
			_this.$loc_sel_map.removeClass('checked');
			_this.$loc_sel_cor.removeClass('checked');
			_this.$loc_map.hide();
			_this.$loc_cor.hide();
			_this.$loc_reg.show();
		});
		this.$loc_sel_map.click(function()
		{
			$(this).addClass('checked');
			_this.$loc_sel_reg.removeClass('checked');
			_this.$loc_sel_cor.removeClass('checked');
			_this.$loc_map.show();
			_this.$loc_cor.hide();
			_this.$loc_reg.hide();
		});
		this.$loc_sel_cor.click(function()
		{
			$(this).addClass('checked');
			_this.$loc_sel_map.removeClass('checked');
			_this.$loc_sel_reg.removeClass('checked');
			_this.$loc_map.hide();
			_this.$loc_cor.show();
			_this.$loc_reg.hide();
		});
		this.$enable_state_sel.click(function()
		{
			_this.$enable_state_sel.toggleClass('checked');
			_this.$state_sel.toggle();
		});
		this.$notes_enable.click(function()
		{
			_this.$notes_enable.toggleClass('checked');
			_this.$notes.toggle();
		}); 
		this.$enable_images.click(function()
		{
			_this.$enable_images.toggleClass('checked');
			_this.$images.toggle();
		}); 
		this.$images.dblclick(function()
		{
			_this.$image_file_input.trigger('click'); 
		});
		this.$image_file_input.on('change', function()
		{
			var blob = $(this)[0].files[0];
			var reader = new FileReader();
			reader.onload = function(event)
			{
				PAGE.add_image(reader.result, 'dataurl');
			}; // data url!
			reader.readAsDataURL(blob);
		})
		this.$types.on('change', function()
		{
			if(_this.$types.val() == 'NEW')
			{
				_this.$new_type_container.show();
			}
			else
			{
				_this.$new_type_container.hide();
			}
		});
		$.getJSON("/voyager/query/types", function(json)
		{
			for(var x = 0; x < json.length; x++)
			{
				var $opt = $("<option value=" + json[x].id + ">" + json[x].name + "</option>");
				_this.$types_sel_opt.before($opt);
			}
		});
		$.getJSON(SP_LOCAL + "/js/countrystate.json", function(json)
		{
			_this.countries = json.countries;
			console.log(_this.countries);
			for(var x = 0; x < json.countries.length; x++)
			{
				var c = json.countries[x];
				var $opt = $("<option value=" + x + ">" + c.country + "</option>");
				//console.log("Adding " + c.country);
				_this.$country_sel.append($opt);
			}
		});
		this.$country_sel.change(function()
		{
			console.log("Helllo");
			_this.$state_sel.find('.vy_gen').each(function()
			{
				$(this).remove();
			});
			var c = _this.countries[_this.$country_sel.val()];
			if(c.states.length > 0)
			{
				for(var x = 0; x < c.states.length; x++)
				{
					var $opt = $("<option class='vy_gen' value=" + x + ">" + c.states[x] + "</option>");
					_this.$state_sel.append($opt);
				}
			}
			else
			{
			}
		});
	}
	
	//Commits data to server and reroutes back to voyager main map.
	/*Data:
		-type : Type of adventure, ID. However, if new_type is '1', then this will be the name of the new type
		-new_type: 1 or 0, see type
		-name : Name of adventure, text
		-notes : Any notes, text
		-location_type: 'reg', 'map', or 'cor'
		-country: present if 'reg', text of country name
		-state: present if 'reg' and a state has been chosen
		-lat: latitude, present if 'cor'
		-lon: longitude
	*/
	save()
	{
		if(this.$types.val() == "SELECT"){this.$error.html("You must choose a type of adventure!"); return;}
		if(!this.$name.val()){this.$error.html("You must provide a name adventure!"); return;}
		if(!(this.$country_sel.val() || (this.$lat.val() && this.$lon.val()))){this.$error.html("You must provide some form of location!"); return;}
		var data = {};
		data.type = this.$types.val();
		data.new_type = 0;
		if(this.$types.val() == "NEW")
		{
			if(!this.$new_type.val()){this.$error.html("You must provide a name for your New Type!"); return;}
			data.type = this.$new_type.val();
			data.new_type = 1;
		}
		data.name = this.$name.val();
		data.notes = this.$notes.val();
		if(this.$loc_sel_reg.hasClass('checked'))
		{
			if(this.$country_sel.val() == 'SELECT'){this.$error.html("You must provide some form of location!"); return;}
			data.location_type = 'reg';
			data.country = this.countries[this.$country_sel.val()].country;
			if(this.$state_sel.val() != 'SELECT')
			{
				data.state = this.countries[this.$country_sel.val()].states[this.$state_sel.val()];
			}
		}
		else if(this.$loc_sel_reg.hasClass('checked'))
		{
			if(1){this.$error.html("You must provide some form of location!"); return;}
			data.location_type = 'map';
		}
		else if(this.$loc_sel_reg.hasClass('checked'))
		{
			if(!(this.$lat.val() && this.$lon.val())){this.$error.html("You must provide some form of location!"); return;}
			data.location_type = 'cor';
			data.lat = this.$lat.val();
			data.lon = this.$lon.val();
		}
		var list = [];
		for(var x = 0; x < this.images.length; x++)
		{
			list.push(this.images.src); // Make a list of dataurls
		}
		data.images = JSON.stringify(list);
		$.getJSON("/voyager/query/new_record", data, function(json)
		{
			window.location = "/voyager"
		});
	}
	
	on_paste(event)
	{
		var items = (event.clipboardData || event.originalEvent.clipboardData).items;
		console.log(JSON.stringify(items)); // will give you the mime types
		for (var index = 0; index < items.length; index++)
		{
			var item = items[index];
			console.log(item.kind);
			if (item.kind === 'file')
			{
				var blob = item.getAsFile();
				var reader = new FileReader();
				reader.onload = function(event)
				{
					PAGE.add_image(reader.result, 'dataurl');
				}; // data url!
				reader.readAsDataURL(blob);
			}
		}
	}
	
	//Adds an image to the 'images' tab. Enables images (if not already) and inserts. Type should be 'dataurl' or 'file'
	add_image(src, type)
	{
		var _this = this;
		if(!this.$enable_images.hasClass('checked'))
		{
			_this.$enable_images.toggleClass('checked');
			_this.$images.toggle();
		}
		var $img = $('<img width=' + ($(window).width()/2) + '></img>');
		$img.attr('src', src);
		$img.attr('style', 'margin-bottom: 2vh;');
		var id = this.arb_img_id;
		$img.click(function()
		{
			if(confirm("Are you sure you want to remove this image?"))
			{
				$img.remove();
				delete _this.images[id];
			}
		});
		this.$images.append($img);
		this.images[this.arb_img_id] = {$dom: $img, type: type, src: src};
		this.arb_img_id++;
	}
	
	//Called when the window resizes
	onResize()
	{
		
	}
}