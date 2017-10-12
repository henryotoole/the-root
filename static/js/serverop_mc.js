//serverop_mc.js
//Javascript to control mostly xhr for the minecraft server operator interface.

QUERY_URL = "/minecraft/query";


//sp_content and sp_local are both path specifiers from the server.
function init(sp_content, sp_local)
{
	console.log("Global init serverop_mc.");
	//initalize page. This is the global reference which we will call upon throughout the code.
	console.log("Using content root: " + sp_content);
	console.log("Using local root: " + sp_local);
	SP_CONTENT = sp_content; //Refrence to the root (leading slash) of the content director: .../.../content
	SP_LOCAL = sp_local; // .../static/the_root
	//If any ajax request returns an error, this is triggered.
	$(document).ajaxError(function(event, jqxhr, settings, thrownError)
	{
		console.log("===========XHR ERROR===========")
		console.log(jqxhr.status + ": " + jqxhr.responseText)
		console.log("===============================")
		if(jqxhr.status == 403)
		{
			alert("You are either not logged in or you lack the necessary privileges to perform this action.");
		}
	});
	$.ajaxSetup({
		//Disable caching for projects. If a project is updated it will not show up even if the file name
		//changes due to caching. It's a pain, and we disable it here. This isn't exactly enterprise level
		//work, so who cares about performance.
		cache: false,
		timeout: 2000
	});
	
	$ctrstop = $('#ctrstop');
	$ctrkill = $('#ctrkill');
	$ctrbackup = $('#ctrbackup');
	$ctrplist = $('#plist');
	
	$statword = $('#statword');
	$statlight = $('#statlight');
	$console = $('#console');
	$onswitch = $('#onswitch');
	
	$onswitch.click(start_server);
	$ctrstop.click(stop_server);
	$ctrkill.click(kill_server);
	$ctrplist.click(plist_server);
	
	//Tell the server to clear the logger buffer.
	//$.getJSON(QUERY_URL + "/log_start")
	//	.done(function()
	//	{
	//		console.log("Log tracker started...");
	//	});
	//Check for new log statements every 3 seconds
	setInterval(log_update, 1000);
}

log_waiting = 0;
current_index = 0;

//Function which will update the console region by appending any log statements the server returns.
//Also updates process status to catch a sudden failure or process exit.
function log_update()
{
	if(log_waiting)
	{
		return;
	}
	console.log("Fetching log statements...");
	log_waiting = 1
	try
	{
		$.getJSON(QUERY_URL + "/log_query", {'index': current_index})
			.done(function(data)
			{
				console.log("Retrurned with status " + data.status);
				status_update_g(data.status);
				if(data.log)
				{
					current_index = data.new_index;
					log_waiting = 0
					for(var x = 0; x < data.log.length; x++)
					{
						//The lines transfered will be utf-8 URI encoded
						$console.append(decodeURIComponent(data.log[x]));
						$console.append("<br>");
						$console.scrollTop(Number.MAX_SAFE_INTEGER);
					}
				}
			});
	}
	finally
	{
		log_waiting = 0;
		console.log("Some error caught");
	}
}



//Updates the graphical parts of the page to reflect a status change.
function status_update_g(stat)
{
	if(stat == 'online')
	{
		$statlight.attr("src", SP_LOCAL + "/icons/status_circle_blue.svg");
		$statword.html("Online");
		$onswitch.removeClass('button-std');
		$onswitch.addClass('button-std-grey');
	}
	else if(stat == 'offline')
	{
		$statlight.attr("src", SP_LOCAL + "/icons/status_circle_dead.svg");
		$statword.html("Offline");
		$onswitch.addClass('button-std');
		$onswitch.removeClass('button-std-grey');
	}
	else
	{
		console.log("Warning: strange status '" + stat + "' returned...");
	}
}

//Sends a command to start the minecraft server.
function start_server()
{
	$.getJSON(QUERY_URL + "/up")
		.done(function()
		{
			console.log("Server started.");
		});
}

//Graceful stop..
function stop_server()
{
	$.getJSON(QUERY_URL + "/down")
		.done(function()
		{
			console.log("Server stopped.");
		});
}

function kill_server()
{
	$.getJSON(QUERY_URL + "/kill")
		.done(function()
		{
			console.log("Server killed...");
		});
}

function plist_server()
{
	$.getJSON(QUERY_URL + "/list")
		.done(function(data)
		{
			console.log(data.players);
			console.log("^ Returned player data");
		});
}