
function init(sp_local, sp_content)
{
	console.log("Init");
	SP_LOCAL = sp_local;
	SP_CONTENT = sp_content;
	
	PAGE = new Page()
}

//A huge list of colors to populate graphs with.
COLOR_LIST_WARM = [
	"#D67646","#943D2C","#474344","#E5BD77","#DFD0BB","#D94330","#EB712F","#FADDAF","#94353C","#DBA72E","#B0703C"
];

COLOR_LIST_COLD = [
	"#5f7c45","#5c7f99","#bedcf5","#121d40","#89a65d","#3b4859","#a3a19f"
];

class Page
{
	constructor()
	{
		var _this = this;
		this.$date_start = $('#date_start');
		this.$date_end = $('#date_end');
		this.$day_list = $('#day_list');
		this.$balance = $('#balance');
		this.$income = $('#income');
		this.$expenses = $('#expenses');
		this.$income_sub = $('#income_sub');
		this.$expenses_sub = $('#expenses_sub');
		this.$tbtn_week = $('#btn_time_week');
		this.$tbtn_month = $('#btn_time_month');
		this.$tbtn_all = $('#btn_time_all');
		this.colorflip = 0; // Flipped between 0 and 1 as days are added, allowing rows the be alternately colored
		this.chart_expenses = null;
		this.chart_income = null;
		
		this.days = [];
		//Dict of types of transaction {id1: {id: id, name: name, etc: etc}}
		this.types = {};
		
		//Uncomment this to autoload entries for debugging.
		/*setTimeout(function() 
		{
			_this.get_dates(getDateYYYYMMDD('2017-06-25'), getDateYYYYMMDD('2017-08-23'));
		}, 250);*/
		
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
		this.$tbtn_week.hover(function() {$(this).html('Week');}, function() {$(this).html('W');}).click(function()
		{
			var now = new Date();
			var prev = new Date(now.getTime() - (7*24*60*60*1000));
			_this.$date_start.val(prev.toISOString().substring(0, 10));
			_this.$date_end.val(now.toISOString().substring(0, 10));
			_this.get_dates(prev, now);
		});
		this.$tbtn_month.hover(function() {$(this).html('Month');}, function() {$(this).html('M');}).click(function()
		{
			var now = new Date();
			var prev = new Date(now.getTime() - (31*24*60*60*1000));
			_this.$date_start.val(prev.toISOString().substring(0, 10));
			_this.$date_end.val(now.toISOString().substring(0, 10));
			_this.get_dates(prev, now);
		});
		this.$tbtn_all.hover(function() {$(this).html('All');}, function() {$(this).html('A');}).click(function()
		{
			$.getJSON("/reginald/greensheet/daterange_all")
				.done(function(data) 
				{
					console.log(data);
					_this.get_dates(getDateYYYYMMDD(data.start), getDateYYYYMMDD(data.end));
				});
		});
		
		//Get the types of transaction. Adds them to their respective subtotal columns.
		$.getJSON("/reginald/greensheet/types")
			.done(function(list) 
			{
				//Count of income and expense transaction types added - used to balance both sides at the end.
				var ic = 0;
				var ec = 0;
				for(var i = 0; i < list.length; i++)
				{
					var t = list[i];
					var $name = $('<div>' + t.name + '</div>');
					var $total = $('<div>$0.00</div>').addClass('f-number');
					var $box = $('<div></div>').addClass('subtotal-box');
					var $color = $('<div></div>').addClass('subtotal-color');
					var $entry = $('<div></div>').addClass('subtotal-entry');
					_this.types[t.id] = {id: t.id, name: t.name, desc: t.desc, income: (t.income == 'True'), $entry: $entry, $name: $name, $total: $total};
					if(t.income == 'True')
					{
						$color.css('background', COLOR_LIST_COLD[ic]);
						$box.append($color).append($name);
						$entry.append($box).append($total);
						_this.$income_sub.append($entry);
						ic++;
					}
					else
					{
						$color.css('background', COLOR_LIST_WARM[ec]);
						$box.append($color).append($name);
						$entry.append($box).append($total);
						_this.$expenses_sub.append($entry);
						ec++;
					}
				}
				//Adds some gag rows to one side or the other to take up space.
				var op = null;
				if(ic < ec)	{op = _this.$income_sub}
				else {op = _this.$expenses_sub}
				for(var i = 0; i < Math.abs(ic - ec); i++)
				{
					op.append($('<div>.</div>').addClass('subtotal-entry'));
				}
				
			});
		this.charts_setup();
	}
	
	//Initializes the charts.
	charts_setup()
	{
		
		var ctexp = $('#chart_expenses')[0].getContext('2d');
		var ctinc = $('#chart_income')[0].getContext('2d');
		var ctglo = $('#chart_global')[0].getContext('2d');
		
		this.chart_expenses = new Chart(ctexp, {
			type: 'doughnut',
			data: {
				datasets: [{
					data: [1]
				}],
				
				labels: ['No data']
			},
			options: {
				legend: {
					display: false
				},
				title: {
					display: true,
					text: 'Expense Summary'
				}
			}
		});
		this.chart_income = new Chart(ctinc, {
			type: 'doughnut',
			data: {
				datasets: [{
					data: [1]
				}],
				
				labels: ['No data']
			},
			options: {
				legend: {
					display: false
				},
				title: {
					display: true,
					text: 'Income Summary'
				}
			}
		});
		this.chart_global = new Chart(ctglo, {
			type: 'line',
			data: {
				datasets: [{
					data: [{x: 0, y: '0000-00-00'}],
					yAxisID: 'reservoir',
					backgroundColor: 'rgba(0, 0, 0, 0.0)',
					borderColor: '#555555',
					pointBackgroundColor: '#555555',
					label: "Daily Balance"
				}, {
					data: [{x: 0, y: '0000-00-00'}],
					yAxisID: 'flow',
					backgroundColor: 'rgba(95 ,124 ,69 , 0.65)',
					label: "Total Funds"
				}],
			},
			options: {
				legend: {
					position: 'bottom'
				},
				title: {
					display: true,
					text: 'Expense Summary'
				},
				scales: {
					xAxes: [{
						type: 'time',
						time: {
							displayFormats: {
								'day': 'YYYY-MM-DD' //Always use ISO, cause it's great.
							}
						}
					}],
					yAxes: [{
						id: 'reservoir'
					}, {
						id: 'flow'
					}]
				},
				elements: {
					line: {
						tension: 0, // disables bezier curves
					}
				}
			}
		});
	}
	
	//Updates the information displayed by a chart. 
	//+chart is the chart to be updated,
	//+data is a list of numbers which will be displayed in proportion to the sum of the list,
	//+labels is a list of labels for each number in data, respectively.
	//+color_list is a list of colors to draw from. This list is assumed to be longer than the data.
	chart_doughnut_update(chart, data, labels, color_list)
	{
		//A note about the complexity here. The config.data object is complicated, and its subgroups contain alot of references
		//that are defined when the chart is instantiated. These references cannot be lost, so we must manually push and pop
		//all new data. NOTE: this method will break down if the graph has multiple datasets.
		
		//Clear all old data
		while(chart.config.data.datasets[0].data.length > 0)
		{
			chart.config.data.datasets[0].data.pop();
		}
		for(var x = 0; x < data.length; x++)
		{
			chart.config.data.datasets[0].data.push(data[x]);
		}
		chart.config.data.datasets[0].backgroundColor = color_list.slice(0, data.length);
		
		chart.config.data.labels = labels
		chart.update();
	}
	
	//Updates info on a number-time chart.
	//+chart is the chart to update,
	//+data_flow is a list of dicts of format {x: YYYY-MM-DD, y: some_number} which represents the local balance of each day.
	//+data_reservoir is a similar list of dicts depicting the total amount of money on each day
	chart_linedate_update(chart, data_flow, data_reservoir)
	{
		while(chart.config.data.datasets[0].data.length > 0)
		{
			chart.config.data.datasets[0].data.pop();
		}
		while(chart.config.data.datasets[1].data.length > 0)
		{
			chart.config.data.datasets[1].data.pop();
		}
		for(var x = 0; x < data_flow.length; x++)
		{
			chart.config.data.datasets[0].data.push(data_flow[x]);
		}
		for(var x = 0; x < data_reservoir.length; x++)
		{
			chart.config.data.datasets[1].data.push(data_reservoir[x]);
		}

		chart.update();
	}
	
	//Clears graphical, numerical, and data.
	clear()
	{
		this.$day_list.empty();
		this.days = []
		//TODO reset numerical
	}
	
	//Dates should be Date objects. Don't provide date_end for a single day.
	//Gets all dates at once from the server and returns them in an ordered list. This ordered list is then added
	//to the page's stack of entries.
	get_dates(date_start, date_end)
	{
		this.clear();
		var _this = this;
		
		//If only the first date is specified, just get that one day.
		if(!date_end)
		{
			$.getJSON("/reginald/greensheet/records_for_day", {'date': date_start.toISOString().substring(0, 10)})
				.done(function(list) 
				{
					_this.add_day(list);
				});
		}
		else if(!date_start)
		{
			//Do nothing, as this makes no sense
		}
		else //Both dates are defined by the user
		{
			var data = {
				'date1': date_start.toISOString().substring(0, 10),
				'date2': date_end.toISOString().substring(0, 10)
			}
			$.getJSON("/reginald/greensheet/records_for_range", data)
				.done(function(data) 
				{
					var list = data.days;
					_this.entering_balance = data.balance_at_start;
					console.log("At start: " + _this.entering_balance);
					for(var i = 0; i < list.length; i++)
					{
						var d = i == list.length - 1; //Ensure we only call calculate for the last entry.
						_this.add_day(list[i], d);
					}
				});
		}
	}
	
	//Add's a day's worth of records to the sheet, from the provided list
	//date is a Date object.
	add_day(list, update=false)
	{
		if(list.length > 0) //If there are records (important cause server returns empty arrays)
		{
			var day = new DayEntry(getDateYYYYMMDDhhmmss(list[0].time), this.colorflip);
			this.colorflip = !this.colorflip; //Flip it so the next row is alternate shade.
			for(var i = 0; i < list.length; i++)
			{
				var t = list[i];
				day.add(new Transaction(t.id, t.amt, t.income == 'True', t.time, t.type, t.method, t.srcdest, t.dest));
			}
			this.days.push(day);
			this.$day_list.append(day.$entry);
		}
		if(update)
		{
			this.update_numbers();
		}
	}
	
	//updates the current numbers based off the days list
	update_numbers()
	{
		console.log("Calculating... (TREBUCHET FLINGING NOISE)");
		var sums_type = {}; //Init a sums dict for the different types of money
		var global_data_flow = []; //used to populate the global graph.
		var global_data_reservoir = []; 
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
		var reservoir_total = parseFloat(this.entering_balance); //TODO add an initial value to this running sum.
		for(var i = 0; i < this.days.length; i++)
		{
			var day = this.days[i];
			var local_total = 0;
			
			for(var ii = 0; ii < day.transactions.length; ii++)
			{
				var trans = day.transactions[ii];
				var amt = trans.amt;
				sums_type[trans.type] += parseFloat(amt);
				local_total += trans.income ? parseFloat(amt): -1 * parseFloat(amt);
				sums[trans.income ? 'income': 'expense'] += parseFloat(amt);
			}
			reservoir_total += local_total;
			global_data_flow.push({x: day.isostring, y: local_total});
			global_data_reservoir.push({x: day.isostring, y: reservoir_total});
		}
		
		var sub_data_exp = {data: [], labels: []};
		var sub_data_inc = {data: [], labels: []};
		
		//Update the subtotals
		for(var key in sums_type)
		{
			if(sums_type.hasOwnProperty(key))
			{
				var type = this.types[key];
				if(type.income)
				{
					sub_data_inc.labels.push(type.name);
					sub_data_inc.data.push(sums_type[key]);
				}
				else
				{
					sub_data_exp.labels.push(type.name);
					sub_data_exp.data.push(sums_type[key]);
				}
				
				this.types[key].$total.html('$' + sums_type[key]);
			}
		}
		
		var balance = sums['income'] - sums['expense'];
		this.$balance.html(balance.toFixed(2));
		this.$income.html(sums['income'].toFixed(2));
		this.$expenses.html(sums['expense'].toFixed(2));
		
		//Lastly, update the charts.
		this.chart_doughnut_update(this.chart_expenses, sub_data_exp.data, sub_data_exp.labels, COLOR_LIST_WARM);
		this.chart_doughnut_update(this.chart_income, sub_data_inc.data, sub_data_inc.labels, COLOR_LIST_COLD);
		this.chart_linedate_update(this.chart_global, global_data_flow, global_data_reservoir);
	}
}









class DayEntry
{
	//'date' should be a Date object.
	//'shaded' is 1 or 0, where 1 indicates this row is shaded and 0 indicates this row will be left white.
	constructor(date, shaded)
	{
		var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dev'];
		var timestr = date.getDate() + ' ' + months[date.getMonth()] + ', ' + date.getFullYear();
		var mstr = (date.getMonth() + 1).toString();
		if(mstr.length < 2)
		{
			mstr = "0" + mstr;
		}
		var dstr = date.getDate().toString();
		if(dstr.length < 2)
		{
			dstr = "0" + dstr;
		}
		this.isostring = date.getFullYear() + '-' + mstr + '-' + dstr;
		this.shaded = shaded;
		this.$date = $('<div></div>').addClass('date-line').html(timestr);
		this.$expense = $('<div></div>').addClass('block-day').css('float', 'left').css('border-right', '1px solid black');
		this.$income = $('<div></div>').addClass('block-day').css('float', 'right').css('border-left', '1px solid black');
		this.$entry = $('<div></div>').addClass('container-day').append(this.$date).append(this.$expense).append(this.$income);
		if(this.shaded)
		{
			//To do this right, we'll have to change some things. uncomment the below and you'll see what I mean.
			//this.$expense.addClass('shading-grey');
			//this.$income.addClass('shading-grey');
		}
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
		//Make sure minutes has a leading zero.
		var mstr = time_date.getMinutes().toString();
		if(mstr.length < 2)
		{
			mstr = "0" + mstr
		}
		var hstr = time_date.getHours().toString();
		if(mstr.length < 2)
		{
			hstr = "0" + hstr
		}
		var time_str = hstr + ":" + mstr;
		
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



















