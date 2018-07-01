 /*
	reginald_autotrans.js

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
		
		this.linesets = [];
		this.lineindex = 0;
		this.types = {};
		
		this.$bulk = $('#bulk');
		this.$eline1 = $('#eline1');
		this.$eline2 = $('#eline2');
		this.$eline3 = $('#eline3').hide();
		this.$eline4 = $('#eline4').hide();
		this.elines = [this.$eline1, this.$eline2, this.$eline3, this.$eline4];
		this.$amt = $('#amt');
		this.$date = $('#date');
		this.$type = $('#type');
		this.$desc = $('#desc');
		this.$rec = $('#rec');
		this.$next = $('#next');
		this.$commit = $('#commit');
		this.$prev = $('#prev');
		this.$error = $('#error');
		this.$msg = $('#msg');
		this.$others = $('#others');
		this.$othersnone = $('#othersnone');
		this.$next.click(function()
		{
			_this.advance(1);
		});
		this.$commit.click(function()
		{
			_this.commit();
		});
		this.$prev.click(function()
		{
			_this.advance(0);
		});
		this.$bulk.on('change', function() //called whenever it loses focus and something has changed.
		{
			console.log("Changed");
			_this.parse($(this).val());
		});
		
		$.getJSON("/reginald/greensheet/types", function(json)
		{
			_this.types = {};
			for(var key in json)
			{
				if(json.hasOwnProperty(key) && json[key].income == 'False')
				{
					var $opt = $("<option value=" + json[key].id + ">" + json[key].name + "</option>");
					_this.$type.append($opt);
					//console.log("Setting type " + json[key].id + " to :")
					//console.log(json[key]);
					_this.types[json[key].id] = json[key];
				}
			}
			console.log(_this.types);
		});
	}
	
	//Parse text.
	parse(bulk)
	{
		this.linesets = [];
		var lset = [];
		var lines = bulk.split('\n');
		for (var x = 0; x < lines.length; x++)
		{
			var line = lines[x];
			var date = this.contains_date(line);
			if(date && lset.length > 0) //If a date was found and we've got a set built up.
			{
				this.linesets.push(lset) //Add the set and blank variable.
				lset = []
			}
			lset.push(line); //Add line to next set
		}
		this.linesets.push(lset) //Push last lset.
		this.lineindex = 0;
		this.show_lines(this.lineindex);
	}
	
	//Next or Prev type thing.
	advance(forward)
	{
		this.clear_output()
		if(this.linesets.length > 0)
		{
			this.lineindex += forward ? 1 : -1;
		}
		this.show_lines(this.lineindex);
	}
	
	show_lines() //Refresh the two entry lines.
	{
		if(this.lineindex < 0)
		{
			this.lineindex = this.linesets.length - 1;
		}
		if(this.lineindex >= this.linesets.length)
		{
			this.lineindex = 0;
		}
		var lset = this.linesets[this.lineindex];
		
		for(var x = 0; x < this.elines.length; x++)
		{
			if(x < lset.length)
			{
				this.elines[x].val(lset[x]).show();
			}
			else
			{
				this.elines[x].hide();
			}
		}
		if(lset.length > 4)
		{
			alert("Warning: Multiple lines in this set. Only two will be shown... If this is a problem needs a code solution.");
		}
		var data = this.get_info(lset);
		if(data.date)
		{
			this.$date.val(data.date);
			this.populate_others_list();
		}
		if(data.amt) {this.$amt.val(data.amt);}
	}
	
	//Attempt to commit whatever's in the boxes.
	commit()
	{
		this.clear_output()
		var _this = this;
		var data = {
			date: this.$date.val() + " 23:50",
			type: this.$type.val(),
			desc: this.$desc.val(),
			amt: this.$amt.val(),
			dst: this.$rec.val(), //Recipient or destination
			income: 0, //Hard-coded 0 for expense
			method: 2 // Hard-coded 2 for Debit Transaction
			};
		console.log(data);
		try {parseFloat(data.amt);} catch (error) {this.$error.html("Improperly formatted amount."); return;}
		try {this.types[parseInt(data.type)];} catch (error) {this.$error.html("You must select a type!"); return;}
		if (!data.dst) {this.$error.html("You must provide some sort of recipient."); return;}
		if (!data.date) {this.$error.html("You must provide a date!"); return;}
		$.getJSON("/reginald/autotrans/add_transaction", data)
			.done(function() 
			{
				_this.$msg.html("Committed!");
				_this.populate_others_list();
			})
			.fail(function()
			{
				_this.$error.html("Some part of this interface is invalidly formatted. It's probably the date.");
			});
	}
	
	//Clear messages and error
	clear_output()
	{
		this.$error.html("")
		this.$msg.html("")
	}
	
	//Populates the list of other transactions which occur on this day.
	populate_others_list()
	{
		this.$others.empty(); // Clear list.
		var date = this.$date.val();
		var _this = this;
		$.getJSON("/reginald/greensheet/records_for_range", {'date1': date, 'date2': date})
			.done(function(days) 
			{
				var _days = days;
				$.getJSON("/reginald/autotrans/records_of_amt", {'amt': _this.$amt.val()})
					.done(function(amtlist) 
					{
						var records = _days.days[0].concat(amtlist);
						if(records.length)
						{
							_this.$othersnone.hide();
						}
						else
						{
							_this.$othersnone.show();
						}
						for(var x = 0; x < records.length; x++)
						{
							var rec = records[x];
							if(rec.type in _this.types)
							{
								var entry = rec.time.split(" ")[0] + ": $" + rec.amt + " " + rec.srcdest + (rec.desc ? " - " + rec.desc : "");
								console.log(rec.amt + " " + _this.$amt.val() + " " + rec.date + " " + _this.$date.val());
								if(rec.amt == _this.$amt.val() && rec.time.split(" ")[0] == _this.$date.val())
								{
									_this.$others.append($('<div style="border: 1px solid red; border-radius: 7px">' + entry + '</div>'));
								}
								else
								{
									_this.$others.append($('<div>' + entry + '</div>'));
								}
							}
						}
					});
			});
	}
	
	//Returns a dict of form {date: date, amt: amt}. Either val can be none, if it could not be found.
	get_info(lset)
	{
		var date = null;
		var amt = null;
		for(var x = 0; x < lset.length; x++)
		{
			var line = lset[x];
			if(this.contains_date(line))
			{
				date = this.contains_date(line);
			}
			if(this.get_amt(line))
			{
				amt = this.get_amt(line);
			}
		}
		return {date: date, amt: amt};
	}
	
	//Simply returns the first piece of a string which contains a negative sign and a parseable float.
	//Return null if none.
	get_amt(str)
	{
		var pts = str.split("/").join(" ").split("\t").join(" ").split(" ");
		for(var x = 0; x < pts.length; x++)
		{
			var pt = pts[x];
			var ft = parseFloat(pt.substring(1))
			if(pt.includes("-") && pt.includes(".") && ft)
			{
				return ft
			}
		}
		return null;
	}
	
	//Return the date if the string contains a date of format MM/DD/YY, or returns 0 if no date appears in that string.
	//Date returned of format YYYY-MM-DD
	contains_date(str)
	{
		var pts = str.split("/").join(" ").split("\t").join(" ").split(" ");
		if(pts.length >= 3)
		{
			var cons_pts = []; //Consecutive parts with two characters that parse to an int.
			for(var x = 0; x < pts.length; x++)
			{
				var pt = pts[x]
				if(pt.length == 2 || (cons_pts.length == 2 && pt.length == 4) && parseInt(pt))
				{
					cons_pts.push(pt);
				}
				else
				{
					cons_pts = []; //Non-consecutive so reset.
				}
				if(cons_pts.length >= 3)
				{
					var yr = cons_pts[2].length == 4 ? cons_pts[2] : "20" + cons_pts[2];
					return yr + "-" + cons_pts[0] + "-" + cons_pts[1];
				}
			}
		}
		return 0;
	}
	
	onResize()
	{
		
	}
}