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
		
		var _this = this;
		this.countries = []; //A list of all countries: [{country: name, states: [name, name, name]}]
		this.$loc_country = $('#loc_country');
		this.$loc_region = $('#loc_region');
		
		//Initialize the country selection dropdowns
		$.getJSON(SP_LOCAL + "/js/countrystate.json", function(json)
		{
			_this.countries = json.countries;
			for(var x = 0; x < json.countries.length; x++)
			{
				var c = json.countries[x];
				var $opt = $("<option value=" + x + ">" + c.country + "</option>");
				_this.$loc_country.append($opt);
			}
		});
		this.$loc_country.change(function()
		{
			_this.$loc_region.find('.vy_gen').each(function()
			{
				$(this).remove();
			});
			if(_this.$loc_country.val() == 'SELECT')
			{
				_this.$loc_region.hide();
				return;
			}
			var c = _this.countries[_this.$loc_country.val()];
			_this.populate_records(c.country, 'VY_ALL');
			if(c.states.length > 0)
			{
				for(var x = 0; x < c.states.length; x++)
				{
					var $opt = $("<option class='vy_gen' value=" + x + ">" + c.states[x] + "</option>");
					_this.$loc_region.append($opt);
				}
				_this.$loc_region.show();
			}
			else
			{
				_this.$loc_region.hide();
			}
		});
		this.$loc_region.change(function()
		{
			var code = "VY_ALL";
			var c = _this.countries[_this.$loc_country.val()];
			if(_this.$loc_region.val() != "VY_ALL")
			{
				code = c.states[_this.$loc_region.val()];
			}
			_this.populate_records(c.country, code);
		});
	}
	
	//Called when the window resizes
	onResize()
	{
		
	}
	
	//Populates records for a specific region or country. Country name should be passed, as well as region name or VY_ALL for all.
	populate_records(country, region)
	{
		console.log(country + " " + region);
		$.getJSON("/voyager/query/records", {country: country, region: region}, function(json)
		{
			console.log(json);
		});
	}
}