
function init(sp_local, sp_content)
{
	console.log("Init");
	SP_LOCAL = sp_local;
	SP_CONTENT = sp_content;
	
	PAGE = new Page()
}


class Page
{
	constructor()
	{
		var _this = this;
		this.$date_start = $('#date_start');
		this.$date_end = $('#date_end');
		this.$day_list = $('#day_list');
		this.$balance = $('#balance');
		
		this.days = [];
		//Dict of types of transaction {id1: {id: id, name: name, etc: etc}}
		this.types = {};
		
		this.$date_start.change(function()
		{
			var date_start = getDateYYYYMMDD(_this.$date_start.val());
			
			if(_this.$date_end.val() != '')
			{
				var date_end = getDateYYYYMMDD(_this.$date_end.val());
				_this.get_dates(date_start, date_end);
			}
			else
			{
				_this.get_dates(date_start, null);
			}
		});
		this.$date_end.change(function()
		{
			var date_end = getDateYYYYMMDD(_this.$date_end.val());
			
			if(_this.$date_start.val() != '')
			{
				var date_start = getDateYYYYMMDD(_this.$date_start.val());
				_this.get_dates(date_start, date_end);
			}
			else
			{
				_this.get_dates(date_end, null);
			}
		});
		
		//Get the types of transaction.
		$.getJSON("/reginald/greensheet/types")
			.done(function(list) 
			{
				for(var i = 0; i < list.length; i++)
				{
					var t = list[i];
					_this.types[t.id] = {id: t.id, name: t.name, desc: t.desc, income: (t.income == 'True')};
				}
			});
	}
	
	//Clears graphical, numerical, and data.
	clear()
	{
		this.$day_list.empty();
		this.days = []
		//TODO reset numerical
	}
	
	//Dates should be Date objects. Don't provide date_end for a single day.
	get_dates(date_start, date_end)
	{
		this.clear();
		var _this = this;
		if(!date_end)
		{
			date_end = new Date(date_start.getTime() + 1); //Increment by 1 milli
		}
		this.dates_req = 0;
		this.dates_rec = 0;
		while(date_start.getTime() < date_end.getTime())
		{
			this.dates_req += 1;
			$.getJSON("/reginald/greensheet/records_for_day", {'date': date_start.toISOString().substring(0, 10)})
				.done(function(list) 
				{
					_this.add_day(list);
				});
			date_start.setDate(date_start.getDate() + 1); //Increment by 1 day.
		}
	}
	
	//Add's a day's worth of records to the sheet, from the provided list
	//date is a Date object.
	add_day(list)
	{
		if(list.length > 0) //If there are records
		{
			var day = new DayEntry(getDateYYYYMMDDhhmmss(list[0].time));
			for(var i = 0; i < list.length; i++)
			{
				var t = list[i];
				day.add(new Transaction(t.id, t.amt, t.income == 'True', t.time, t.type, t.method, t.srcdest, t.dest));
			}
			this.days.push(day);
			this.$day_list.append(day.$entry);
		}
		this.dates_rec += 1;
		if(this.dates_rec >= this.dates_req)
		{
			this.update_numbers();
		}
	}
	
	//updates the current numbers based off the days list
	update_numbers()
	{
		var sums_type = {}; //Init a sums dict for the different types of money
		for(var key in this.types)
		{
			if(this.types.hasOwnProperty(key))
			{
				sums_type[this.types[key].id] = 0;
			}
		}
		//Sums for income v expense
		var sums = {}
		sums['income'] = 0.0;
		sums['expense'] = 0.0;
		console.log(sums);
		for(var i = 0; i < this.days.length; i++)
		{
			var day = this.days[i];
			
			for(var ii = 0; ii < day.transactions.length; ii++)
			{
				var trans = day.transactions[ii];
				var amt = trans.amt;
				sums_type[trans.type] += parseFloat(amt);
				sums[trans.income ? 'income': 'expense'] += parseFloat(amt);
			}
		}
		console.log(sums);
		console.log(sums_type);
		var balance = sums['income'] - sums['expense'];
		this.$balance.html(balance.toFixed(2));
	}
}









class DayEntry
{
	//Date should be a Date object
	constructor(date)
	{
		var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dev'];
		var timestr = date.getDay() + ' ' + months[date.getMonth()] + ', ' + date.getFullYear();
		this.$date = $('<div></div>').addClass('date-line').html(timestr);
		this.$expense = $('<div></div>').addClass('block-day').css('float', 'left').css('border-right', '1px solid black');
		this.$income = $('<div></div>').addClass('block-day').css('float', 'right').css('border-left', '1px solid black');
		this.$entry = $('<div></div>').addClass('container-day').append(this.$date).append(this.$expense).append(this.$income);
		this.transactions = [];
	}
	
	//Add a transaction to this day entry
	add(trans)
	{
		this.transactions.push(trans);
		if(trans.income)
		{
			this.$income.append(trans.$entry);
		}
		else
		{
			this.$expense.append(trans.$entry);
		}
	}
}


class Transaction
{
	constructor(id, amt, income, date, type, method, srcdest, description)
	{
		this.id = id;
		this.amt = amt;
		this.income = income;
		this.date = date;
		this.type = type;
		this.method = method;
		this.srcdest = srcdest;
		this.description = description;
		
		var time_date = getDateYYYYMMDDhhmmss(date);
		var time_str = time_date.getHours() + ":" + time_date.getMinutes();
		
		this.$time = $('<div></div>').addClass('value-left').css('width', '9%').html(time_str);
		this.$amt = $('<div></div>').addClass('value').css('width', '13%').html('$' + this.amt);
		this.$type = $('<div></div>').addClass('value').css('width', '25%').html(PAGE.types[this.type].name);
		this.$srcdest = $('<div></div>').addClass('value').css('width', '49%').html(this.srcdest);
		this.$entry = $('<div></div>').addClass('entry').append(this.$time).append(this.$amt).append(this.$type).append(this.$srcdest);
	}
}


/*
<div class='block-day' style='float: left;'>
<div style='width: 100%;'> Date; date </div>
<div class='entry'>
	<div class='value' style='width: 7%'> Time </div>
	<div class='value' style='width: 15%'> 345.45 </div>
	<div class='value' style='width: 25%'> Type </div>
	<div class='value' style='width: 49%'> Recipient </div>
</div>*/


//Simply parses a YYYY-MM-DD datestring and returns the Date object
function getDateYYYYMMDD(str)
{
	var parts = str.split('-');
	return new Date(parts[0], parts[1]-1, parts[2]); // earliest date
}

//Parses string of format YYYY-MM-DD hh:mm:ss
function getDateYYYYMMDDhhmmss(str)
{
	var spl = str.split(' ');
	var lefts = spl[0].split('-');
	var rights = spl[1].split(':');
	return new Date(lefts[0], lefts[1]-1, lefts[2], rights[0], rights[1], rights[2]); // earliest date
}



















