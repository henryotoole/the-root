/*
	voyager.js

	This is a simply web app to handle task managment and capture/release productive potential.
	@license Copyright (C) 2018  Joshua Reed
	This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

//sp_content and sp_local are both path specifiers from the server.
function init(sp_local, sp_content, sp_webvsn)
{
	console.log("Global init (untether_edit.js).");
	//initalize page. This is the global reference which we will call upon throughout the code.
	console.log("Using content root: " + sp_content);
	console.log("Using local root: " + sp_local);
	SP_LOCAL = sp_local;
	SP_CONTENT = sp_content;
	SP_WEBVSN = sp_webvsn;
	
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

class EntryOverlay
{
	constructor($greyout)
	{
		var _this = this;
		this.$entry_overlay = $('#entry_overlay');
		this.$complete = $('#eo_complete');
		this.$cancel = $('#eo_cancel').click(function(){_this.finish(0);});
		this.$name = $('#eo_name');
		this.$deadline = $('#eo_deadline');
		this.$dltype = $('#eo_dltype').click(function()
		{
			$(this).toggleClass('checked');
		});
		this.$greyout = $greyout;
		this.$error = $('#eo_error');
		this.cat_id = null;
		this.entry = null;
	}
	
	//Shows the entry overlay. A cat_id should be supplied if the intent is to create a new one.
	//if entry is not provided assume intent is to create a new one.
	engage(entry, cat_id)
	{
		var _this = this;
		this.$dltype.removeClass('checked');
		console.log(entry);
		this.entry = null;
		this.$complete.unbind(); // This is critical. Click events stack, and must be cleared.
		if(entry) //We are editing
		{
			this.$complete.click(function(){_this.finish(1);});
			this.$name.val(entry.name);
			this.cat_id = entry.cat_id;
			this.$dltype.toggleClass('checked', entry.deadline_soft ? false : true);
			this.entry = entry;
		}
		else //We are creating new entry
		{
			this.$complete.click(function(){_this.finish(2);});
			this.$name.val("");
			this.cat_id = cat_id;
		}
		
		this.$entry_overlay.show();
		this.$greyout.show();
	}
	
	//Processes and closes the entry overlay with either an edit (1), creation (2), or no action (0).
	finish(op)
	{
		if(op)
		{
			var name = this.$name.val();
			var deadline = PAGE.currently_showing;
			var soft = this.$dltype.hasClass('checked') ? 0 : 1;
			console.log(this.$dltype.hasClass('checked'));
			if(!name)  {this.error("You must provide a name!"); return;}
			if(op == 1) //edit
			{
				PAGE.edit_entry(this.entry, true, null, null, null, deadline, name, soft);
			}
			else if(op == 2) //create
			{
				$.getJSON("/stack/query/create_entry", {name: name, cat_id: this.cat_id, deadline: deadline, soft: soft}, function(entry)
				{
					PAGE.add_entry(entry);
				});
			}
		}
		this.$entry_overlay.hide();
		this.$greyout.hide();
	}
	
	error(msg)
	{
		this.$error.show();
		this.$error.html(msg);
	}
	
	error_hide()
	{
		this.$error.hide();
		this.$error.html('');
	}
}

class HiddenCatOverlay
{
	constructor($greyout)
	{
		var _this = this;
		this.$greyout = $greyout;
		this.$hc_overlay = $('#hc_overlay');
		this.$hc_list = $('#hc_list');
		this.$hc_done = $('#hc_done').click(function(){_this.finish();});
	}
	
	//Shows the entry overlay. A cat_id should be supplied if the intent is to create a new one.
	//if entry is not provided assume intent is to create a new one.
	engage()
	{
		this.$hc_overlay.show();
		this.$greyout.show();
		
		this.$hc_list.empty();
		
		for (var id in PAGE.categories)
		{
			if (PAGE.categories.hasOwnProperty(id))
			{           
				/*<div class='org-row-flung f-raleway-para stack-cat-hidden-entry'>
					<div> Some Category Name </div>
					<div class='stack-cat-hidden-icon'>
						<img src='{{sp_local}}/icons/check.svg?web_vsn={{ web_vsn }}' width='100%' height='100%'>
					</div>
				</div>*/
				var cat = PAGE.categories[id];
				var $name = $("<div>" + cat.name + "</div>");
				var $img_div = $("<div></div>").addClass('stack-cat-hidden-icon');
				var $img = $("<img src='" + SP_LOCAL + "/icons/check.svg?web_vsn=" + SP_WEBVSN + "' width='100%' height='100%'>");
				if(cat.hidden)
				{
					$img.hide();
				}
				$img_div.append($img);
				var $dom = $("<div class='org-row-flung f-raleway-para stack-cat-hidden-entry'></div>").append($name).append($img_div)
				.attr('st_catid', cat.id)
				.click(function(e)
				{
					e.stopPropagation();
					var id_local = parseInt($(this).attr('st_catid'));
					var icat = PAGE.categories[id_local];
					var $img = $(this).find('img');
					if(icat.hidden) /// If it WAS hidden it now will be VISIBLE
					{
						PAGE.categories[id_local].hidden = false;
						$img.show();
					}
					else
					{
						PAGE.categories[id_local].hidden = true;
						$img.hide();
					}
				});
				this.$hc_list.append($dom);
			}
		}
	}
	
	//Processes and closes the entry overlay with either an edit (1), creation (2), or no action (0).
	finish()
	{
		this.$hc_overlay.hide();
		this.$greyout.hide();
		
		//Update server concerning all entries which have been changed.
		var data_out = [];
		for (var id in PAGE.categories)
		{
			if (PAGE.categories.hasOwnProperty(id))
			{
				data_out.push({id: id, hidden: PAGE.categories[id].hidden});
			}
		}
		$.getJSON("/stack/query/update_cat_visibilities", {cat_list_jsonstr: JSON.stringify(data_out)}, function()
		{
			console.log("Mass-category visibility update successful.");
			PAGE.refresh_cats();
		});
	}
}

class Page
{
	//A general note about the function of this page.
	
	constructor()
	{
		var _this = this;
		$(window).resize(function ()
		{
			//Note, this can be called continuously or at the end of a resize, depending on browser.
			PAGE.onResize();
		});
		this.onResize();
		this.$greyout = $('#greyout');
		this.entry_overlay = new EntryOverlay(this.$greyout);
		this.hc_overlay = new HiddenCatOverlay(this.$greyout);
		
		this.$cat_header = $('#cat_header');
		this.$cat_region = $('#cat_region');
		this.$new_cat_btn = $('#cat_add_btn').click(function(){_this.create_cat('New Category');});
		this.$hc_btn = $('#hc_btn').click(function(){_this.hc_overlay.engage();});
		this.$date_day = $('#date_day'); // Mon, Tue, Etc.
		this.$date_date = $('#date_date'); // 11 Nov. etc.
		this.$date_year = $('#date_year'); // 2018 etc.
		this.$date_forward = $('#date_forward').click(function(){_this.date_advance(1)}); // Arrow up
		this.$date_backward = $('#date_backward').click(function(){_this.date_advance(-1)});  // Arrow down

		this.categories = {}; //[id] -> id, $dom, $col, $name, name
		this.currently_showing = null; // The day we are currently showing (in days since Jan 1 1970)
		this.entries = {} //[id] -> ??? Contains only loaded entries.
		this.src_cross = SP_LOCAL + "/icons/plus.svg?web_vsn=" + SP_WEBVSN;
		this.src_check = SP_LOCAL + "/icons/check.svg?web_vsn=" + SP_WEBVSN;
		
		this.refresh_cats();
		this.load_day(this.getDaysFromTime(new Date(Date.now()))); //Load today.
	}
	//Load entries for a day (given in days since 1970 Jan 1)
	//Get from json -> organize into category entry lists -> populate graphical from entry lists
	load_day(days)
	{
		console.log("DAYS: " + days);
		var _this = this;
		this.currently_showing = days;
		this.set_time_indicators(days);
		this.remove_all_loaded_entries();
		$.getJSON("/stack/query/get_day", {for_day: days, today: this.getDaysFromTime(new Date(Date.now()))}, function(entries)
		{
			console.log("DATA FROM SERVER");
			for(var i = 0; i < entries.length; i++)
			{
				console.log("id: " + entries[i].id + "  pr: " + entries[i].priority);
			}
			entries = _this.unscramble_priorities(entries);
			console.log("POSTSORTED");
			for(var i = 0; i < entries.length; i++)
			{
				console.log("id: " + entries[i].id + "  pr: " + entries[i].priority);
			}
			//Add entry data to category entry lists.
			for(var i = 0; i < entries.length; i++)
			{
				_this.add_entry(entries[i]);
			}
		});
	}
	
	//Advances the date by the number of days provided. Can be negative.
	date_advance(days)
	{
		this.load_day(this.currently_showing + days);
	}
	
	set_time_indicators(days)
	{
		var date = this.getDateFromDays(days);
		this.$date_day.html(this.getDayOfWeekAbbr(date));
		this.$date_date.html(this.getMonthAbbr(date) + " " + (date.getDate()));
		this.$date_year.html(date.getFullYear());
	}
	
	//Responsible for sorting this entry into the correct position in the list.
	add_entry(entry)
	{
		console.log("ADDING ENTRY " + entry.name + " w/p " + entry.priority);
		entry.completed = entry.completed == "True" || entry.completed == 1 ? 1 : 0
		entry.deadline_soft = entry.deadline_soft == "True" || entry.deadline_soft == 1 ? 1 : 0
		entry.has_notes = entry.has_notes == "True" || entry.has_notes == 1 ? 1 : 0
		var _this = this;
		var cat = this.categories[entry.cat_id];
		var $img = $("<img width='75%' height='75%'></img>");
		var $checkbox = $("<div class='stack-checkbox org-center'></div>").click(function(e)
		{
			e.stopPropagation();
			var chk = $(this).hasClass('stack-checkbox-checked');
			if(chk) {$(this).removeClass('stack-checkbox-checked');} else {$(this).addClass('stack-checkbox-checked');}
			$(this).find('img').first().attr('src', chk ? _this.src_cross : _this.src_check);
			_this.edit_entry(entry, true, null, null, !chk); //Update checked status on server
		}).append($img);
		if(entry.completed)
		{
			$checkbox.addClass('stack-checkbox-checked').find('img').attr('src', _this.src_check);
		}
		else
		{
			$checkbox.find('img').attr('src', _this.src_cross);
		}
		var $edit = $("<div></div>").addClass("unt-catbtn").addClass("hover-grey")
			.append($("<img src='" + SP_LOCAL + "/icons/feather.svg?web_vsn=" + SP_WEBVSN + "' width='100%' height='100%'>")).click(function(e)
			{
				e.stopPropagation();
				_this.entry_overlay.engage(entry);
			});
		var $delete = $("<div></div>").addClass("unt-catbtn").addClass("hover-red")
			.append($("<img src='" + SP_LOCAL + "/icons/fire.svg?web_vsn=" + SP_WEBVSN + "' width='100%' height='100%'>")).click(function(e)
			{
				e.stopPropagation();
				if(confirm("Are you sure you want to delete the '" + entry.name + "' task?"))
				{
					_this.remove_entry(entry.id);
				}
			});
		var $name = $("<textarea></textarea>").addClass("stack-entry-taname").addClass('f-raleway-para')
			.val(entry.name).attr('readonly', 'true').attr('size', entry.name.length)
			.focusout(function(e)
			{
				$(this).attr('readonly', 'true').removeClass('sel-highlight-bg-lblue'); //The 'save' of a name change is called when the user deselects the name.
				_this.entries[entry.id].name = $(this).val(); //Memory effect
				_this.edit_entry(entry, false, null, null, null, null, $(this).val()); // Effect change on server
				_this.resize_text_area($(this)); // just in case
			})
			.click(function(e)
			{
				e.stopPropagation();
				_this.entries[entry.id].$name.removeAttr('readonly').addClass('sel-highlight-bg-lblue').focus();
			})
			.on('keydown', function() //Resize every time there's a keydown
			{
				_this.resize_text_area($(this));
			});
		var $btndiv = $('<div></div>').append($edit).append($delete).addClass("org-row-spaced").addClass("stack-entry-btndiv");
		var $sdiv = $('<div class="org-row-flung" style="flex-grow: 1"></div>').append($name).append($btndiv);
		var $dom = $("<div class='stack-entry'></div>").attr('st_id', entry.id)
			.append($checkbox).append($sdiv)
			.click(function(e)
			{
				e.stopPropagation();
			}).hover(function()	{
				$btndiv.css({'visibility': 'visible'})
			}, function() {
				$btndiv.css({'visibility': 'hidden'});
			})
			.attr('draggable', 'true')
			.on('dragstart', function(e)
			{
				e.originalEvent.dataTransfer.setData("id", entry.id);
			})
			.on('drop' , function(e)
			{
				var orig_id = e.originalEvent.dataTransfer.getData("id");
				_this.set_entry_border($(this), _this.entries[orig_id].completed, 0); // Clear borders
				var pos = -1*Math.sign(e.pageY -  $(this).offset().top - ($(this).height() / 2));
				var $target = $(e.target);
				while(!$target.hasClass('stack-entry'))
				{
					$target = $target.parent();
					if($target.is('body')) //If we've gone too far up the stack and not found a stack-entry.
					{
						return;
					}
				}
				var targ_id = $target.attr("st_id");
				_this.reinsert_entry_priority(orig_id, targ_id, pos, $dom.parent(), _this.entries[targ_id].$dom.parent());
			})
			.bind('dragenter', function(e) // Used to handle placement between other entries
			{
				e.preventDefault(); e.stopPropagation();
			})
			.bind('dragover', function(e) // Draw border on top or bottom to indicate placement.
			{
				//Needed so drop will work
				e.preventDefault(); e.stopPropagation();
				//Check whether in top or bottom half of element.
				var pos = -1*Math.sign(e.pageY -  $(this).offset().top - ($(this).height() / 2));
				_this.set_entry_border($(this), entry.completed, pos);
			})
			.bind('dragleave', function(e) // Remove all non-required borders
			{
				e.preventDefault(); e.stopPropagation();
				_this.set_entry_border($(this), entry.completed, 0);
			});
		entry.$dom = $dom;
		entry.$name = $name;
		this.entries[entry.id] = entry;
		
		this.set_entry_border($dom, entry.completed, 0); // Set base borders w/ no dragover
		if(entry.completed)
		{
			$name.css('color', '#999999');
			this.add_prioritized_entry_to_list(entry, cat.$erc, $dom)
		}
		else
		{
			this.add_prioritized_entry_to_list(entry, cat.$eri, $dom)
		}
		this.resize_text_area($name); // Must go after append.
	}
	
	//Sets the provided entry's border based on whether it's completed and there's a drag event.
	// Completed is 1 or 0
	// Dragover is 1 for top, 0 for none, and -1 for bottom
	set_entry_border($entry_dom, completed, dragover)
	{
		$entry_dom.css('border-top', 'none');
		$entry_dom.css('border-bottom', 'none');
		if(completed)
		{
			$entry_dom.css('border-bottom', '1px solid #999999');
		}
		else
		{
			$entry_dom.css('border-top', '1px solid #999999');
		}
		if(dragover < 0)
		{
			$entry_dom.css('border-bottom', '2px solid #333333');
		}
		else if(dragover > 0)
		{
			$entry_dom.css('border-top', '2px solid #333333');
		}
	}
	
	//Call when you wish to insert an entry from one position/list into another position/list. THERE MUST BE ELEMENTS IN THE LIST
	//e.g. this should only be called off an existing element in a list somewhere as the drag target.
	// insert_id - the ID of the entry being inserted
	// insert_loc_id - the ID of the entry we are inserting above/below of
	// pos - 1 for above, -1 for below.
	// $list_old - the list that the insertion entry came from
	// $list_new - the new list we are inserting into
	//NOTE that for this to work with non-listed entries that may show up later, the inserted entry MUST replace an existing entry.
	reinsert_entry_priority(insert_id, insert_loc_id, pos, $list_old, $list_new)
	{
		console.log(">>> ATTEMPTING REINSERTION <<<");
		console.log("Inserting " + insert_id + " " + (pos > 0 ? 'above' : 'below') + " " + insert_loc_id);
		var altered_entry_ids = [insert_id];
		//get priority of existing entry
		var ins_old_priority = this.entries[insert_id].priority;
		
		//shift all higher old list entries (complete and incomplete) down 1 to accommodate for missing entry
		for(var i = 0; i < $list_old.children().length; i++)
		{
			var id = $list_old.children().eq(i).attr('st_id');
			var pr = this.entries[id].priority;
			//console.log("Checking entry " + id + " with priority " + pr);
			if(pr >= ins_old_priority && id != insert_id)
			{
				altered_entry_ids.push(id);
				this.entries[id].priority = pr-1; // Shift all down by 1 to 'fill' empty spot
			}
		}
		var ins_new_priority = parseInt(this.entries[insert_loc_id].priority) + (pos > 0 ? 1 : 0);
		//shift all higher new list entries up 1 to accomodate for new entry.
		var ins_new_cat_id = 0;
		for(var i = 0; i < $list_new.children().length; i++)
		{
			var id = $list_new.children().eq(i).attr('st_id');
			var pr = this.entries[id].priority;
			//console.log("Checking entry " + id + " with priority " + pr);
			if(pr >= ins_new_priority && id != insert_id)
			{
				if(!altered_entry_ids.includes(id)) {altered_entry_ids.push(id);}
				this.entries[id].priority = pr+1; // Shift all up by 1 to 'expand' to accomodate new entry
			}
		}
		//Put changed entry in correct place.
		this.entries[insert_id].priority = ins_new_priority;
		this.entries[insert_id].cat_id = this.entries[insert_loc_id].cat_id; // Change to different cat if called for
		
		//Update server concerning all entries which have been changed.
		var data_out = [];
		for(var i = 0; i < altered_entry_ids.length; i++)
		{
			data_out.push({id: altered_entry_ids[i], priority: this.entries[altered_entry_ids[i]].priority});
		}
		data_out[0].cat_id = this.entries[insert_loc_id].cat_id; // Add in new cat ID for inserted entry
		$.getJSON("/stack/query/update_entries", {entry_list_jsonstr: JSON.stringify(data_out)}, function()
		{
			console.log("Mass-entry priority update successful.");
		});
		this.redraw_entries_from_memory(altered_entry_ids);
	}
	
	// Entry is an entry data object, and $list is the dom element containing entries.
	// $entry is the dom element to be appended.
	add_prioritized_entry_to_list(entry, $list, $entry)
	{
		var last_pr = 9999;
		var max_pr = -1;
		var els = $list.children()
		//Assuming each successive priority is lower than the last.
		for(var i = 0; i < els.length; i++)
		{
			var id = $list.children().eq(i).attr('st_id');
			var c_pr = this.entries[id].priority;
			//If this entrie's priority is between the last and next one, it fits before the next one.
			if(entry.priority < last_pr && entry.priority > c_pr)
			{
				els.eq(i).before($entry);
				return;
			}
			last_pr = c_pr;
			max_pr = Math.max(max_pr, c_pr);
		}
		if(entry.priority < 0) // Special case when there are no children.
		{
			this.edit_entry(entry, true, (max_pr+1));
			return;
		}
		$list.append($entry);
	}
	
	// Given a list of entries, restructure the priorities such that order is preserved and no two entries
	// have identical priorities. Returns the altered list of entries in descending priority order.
	// Also cues for an update of relevant entries on server (data only).
	unscramble_priorities(entries)
	{
		var edict = {};
		var ip_list = []
		var entries_sorted = [];
		var data_out = [];
		for(var i = 0; i < entries.length; i++)
		{
			ip_list.push({pr: entries[i].priority, id: entries[i].id});
			edict[entries[i].id] = entries[i];
		}
		ip_list.sort(this.uns_compfn); //Sorted with lowest priorities first.
		var pr_counter = {}; // {cat_id: counter, cat_id2, counter2} used to count priorities.
		for(var i = 0; i < ip_list.length; i++)
		{
			var entry = edict[ip_list[i].id];
			if(!pr_counter[entry.cat_id])
			{
				pr_counter[entry.cat_id] = 0;
			}
			entries_sorted.push(entry);
			entries_sorted[entries_sorted.length - 1].priority = pr_counter[entry.cat_id];
			data_out.push({id: ip_list[i].id, priority: pr_counter[entry.cat_id]});
			pr_counter[entry.cat_id]++;
		}
		$.getJSON("/stack/query/update_entries", {entry_list_jsonstr: JSON.stringify(data_out)}, function()
		{
			console.log("Mass-entry priority update successful.");
		});
		return entries_sorted;
	}
	
	uns_compfn(a, b)
	{
		if(a.pr < b.pr)
		{
			return -1;
		}
		else if(a.pr > b.pr)
		{
			return 1;
		}
		return 0;
	}
	
	resize_text_area($dom) //Resize every time there's a keydown
	{
		$dom.attr('size', $dom.val().length);
		$dom.css('height', '1em');
		// Get the computed styles for the element
		var computed = window.getComputedStyle($dom[0]);

		// Calculate the height
		var height = parseInt(computed.getPropertyValue('border-top-width'), 10)
					+ parseInt(computed.getPropertyValue('padding-top'), 10)
					+ $dom[0].scrollHeight;
					+ parseInt(computed.getPropertyValue('padding-bottom'), 10)
					+ parseInt(computed.getPropertyValue('border-bottom-width'), 10);
		$dom.css('height', height + 'px');
		console.log("Resize to " + height);
	}
	
	//Changes entry data on server and IF REDRAW: redraws/redata's it on client with IN MEMORY data.
	edit_entry(entry, redraw, priority=null, cat_id=null, completed=null, deadline=null, name=null, soft=null)
	{
		var data = {id: entry.id, current_day: this.getDaysFromTime(new Date(Date.now()))}
		var _this = this;
		if(priority != null) {data.priority = priority;}
		if(completed != null) {data.completed = completed ? 1 : 0;}
		if(deadline != null) {data.deadline = deadline;}
		if(name != null) {data.name = name;}
		if(cat_id != null) {data.cat_id = cat_id;}
		if(soft != null) {data.soft = soft ? 1 : 0;}
		console.log("++Updating " + entry.name + " to be: ");
		console.log(data);
		$.getJSON("/stack/query/edit_entry", data, function(entry_new)
		{
			if(redraw)
			{
				_this.remove_entry_graphical(entry.id);
				_this.add_entry(entry_new);
			}
		});
	}
	
	redraw_entry(entry)
	{
		this.remove_entry_graphical(entry.id);
		this.add_entry(entry);
	}
	
	//Redraw entries from in-memory data given a simple list of ID's
	redraw_entries_from_memory(entry_ids)
	{
		for(var i = 0; i < entry_ids.length; i++)
		{
			this.redraw_entry(this.entries[entry_ids[i]]);
		}
	}
	
	remove_entry_graphical(entry_id)
	{
		this.entries[entry_id].$dom.remove();
	}
	
	remove_entry(entry_id)
	{
		var _this = this;
		$.getJSON("/stack/query/del_entry", {id: entry_id}, function()
		{
			_this.remove_entry_graphical(entry_id); // Remove from graphical
			delete _this.entries[entry_id]; // Remove from data
		});
	}
	
	//Removes all entries which have been loaded FROM CLIENT (not from server).
	remove_all_loaded_entries()
	{
		for (var key in this.entries)
		{
			if (this.entries.hasOwnProperty(key))
			{           
				this.remove_entry_graphical(key);
				delete this.entries[key];
			}
		}
	}
	
	//Gets the number of days since Jan 1 1970 that the provided date or time is.
	getDaysFromTime(date)
	{
		var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
		var firstDate = new Date(1970,1,1);
		var secondDate = new Date(date.getFullYear(),date.getMonth(),date.getDate());

		return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime())/(oneDay)));
	}
	
	//MOVE_TO_UTIL
	//Gets the current date given the number of days between the current date and Jan 1 1970
	getDateFromDays(days)
	{
		var elapsedms = 24*60*60*1000*days;
		var j1970ms = new Date(1970,1,1).getTime();
		var present = new Date();
		present.setTime(j1970ms + elapsedms);
		return present;
	}
	
	getDayOfWeekAbbr(date)
	{
		var abbrs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];
		return abbrs[date.getDay()];
	}
	
	getMonthAbbr(date)
	{
		var abbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
		return abbrs[date.getMonth()];
	}
	//END UTIL MOVE
	
	//Called on init to add all existing categories
	refresh_cats()
	{
		var _this = this;
		this.$cat_header.empty();
		this.$cat_region.empty();
		$.getJSON("/stack/query/cat_get_all", {}, function(cat_list)
		{
			if(cat_list.length == 0)
			{
				_this.create_cat('General');
				return;
			}
			//First sum the number that should be shown.
			var n_shown = 0;
			for(var i = 0; i < cat_list.length; i++)
			{
				n_shown += cat_list[i].hidden == 'True' ? 1 : 0;
			}
			var wid = 100.0 / n_shown;
			for(var i = 0; i < cat_list.length; i++)
			{
				var cat = cat_list[i];
				_this.add_cat(cat, wid, i!=0);
				console.log("Creating category " + cat.name + " of ID " + cat.id);
			}
		});
		if(this.currently_showing) {this.load_day(this.currently_showing);} // Make sure to reload current tasks
	}
	
	create_cat(name)
	{
		var _this = this;
		$.getJSON("/stack/query/cat_create", {name: name}, function(new_cat)
		{
			_this.refresh_cats();
		});
	}
	
	add_cat(cat_dict, widthpct, border)
	{
		var vhidden = cat_dict.hidden == 'True';
		var _this = this;
		var $rename = $("<div></div>").addClass("unt-catbtn").addClass("hover-grey")
			.append($("<img src='" + SP_LOCAL + "/icons/feather.svg?web_vsn=" + SP_WEBVSN + "' width='100%' height='100%'>")).click(function(e)
			{
				e.stopPropagation();
				_this.categories[cat_dict.id].$name.removeAttr('readonly').addClass('sel-highlight-bg-lblue').focus();
			});
		var $delete = $("<div></div>").addClass("unt-catbtn").addClass("hover-red")
			.append($("<img src='" + SP_LOCAL + "/icons/fire.svg?web_vsn=" + SP_WEBVSN + "' width='100%' height='100%'>")).click(function(e)
			{
				e.stopPropagation();
				if(confirm("Are you sure you want to delete the '" + name + "' category? All contained entries will be deleted as well."))
				{
					_this.del_cat(cat_dict.id);
				}
			});
		var $name = $("<input></input>").addClass("input-div").addClass('f-raleway-para')
			.attr('value', cat_dict.name).attr('readonly', 'true').attr('size', cat_dict.name.length)
			.focusout(function(e)
			{
				$(this).attr('readonly', 'true').removeClass('sel-highlight-bg-lblue'); //The 'save' of a name change is called when the user deselects the name.
				_this.categories[cat_dict.id].name = $(this).val(); //Memory effect
				$.getJSON("/stack/query/cat_rename", {id: cat_dict.id, name: $(this).val()}).done(function(json) //Server effect
				{
					console.log("Rename success on server");
				});
			})
			.keydown(function() //Resize every time there's a keydown
			{
				$(this).attr('size', $(this).val().length);
			});
		var $btndiv = $('<div></div>').append($rename).append($delete).addClass("org-row-spaced").css({'visibility': 'hidden'});
		var $btndiv_dummy = $('<div style="width: 56px; height: 10px"></div>')
		var $col = $('<div></div>').addClass('stack-col').css('width', widthpct+'%').click(function()
		{
			_this.entry_overlay.engage(null, cat_dict.id);
		});
		var $entry_reg = $('<div></div>').addClass('org-col').addClass('stack-col-entry-reg');
		var $entry_reg_complete = $('<div></div>').addClass('org-col').addClass('stack-col-entry-reg').css('border-top', '1px solid #222222');
		// This spacer exists because adding padding to $col results on some weird overflow behavior.
		var $spacer = $('<div></div>').addClass('stack-col-spacer');
		$col.append($entry_reg).append($entry_reg_complete).append($spacer);
		var $dom = $('<div></div>')
			.addClass('org-center').addClass('stack-col-name-dom')
			.css('width', widthpct+'%')
			.prepend($btndiv_dummy).append($name).append($btndiv).hover(function()	{
				$btndiv.css({'visibility': 'visible'})
			}, function() {
				$btndiv.css({'visibility': 'hidden'});
			});
		if(border) // Ensure that the leftmost category has no border.
		{
			console.log("ADDING BORDER TO " + cat_dict.name);
			$col.css('border-left', '1px solid #AAAAAA');
		}
		if(!vhidden)
		{
			_this.$cat_region.append($col);
			_this.$cat_header.append($dom);
		}
		this.categories[cat_dict.id] = {id: cat_dict.id, $dom: $dom, $eri: $entry_reg, $erc: $entry_reg_complete, 
										$name: $name, name: cat_dict.name, hidden: vhidden}
	}
	
	//Deletes the category of that ID from the server, client data, and dom
	del_cat(id)
	{
		var _this = this;
		if(this.categories[id])
		{
			$.getJSON("/stack/query/cat_del", {'id': id})
				.done(function(json)
				{
					console.log("Deleted category on server. Removing from client data and visual...");
					delete _this.categories[id];
				});
		}
		this.refresh_cats()
	}
	
	//Called when the window resizes
	onResize()
	{
		
	}
	
}