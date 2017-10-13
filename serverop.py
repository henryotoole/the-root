#serverop.py
#A set of functions for running servers via flask as an interface and controller


from the_root import app

import flask
from flask_login import login_required, current_user

from flask import render_template, redirect, request, jsonify

from subprocess import Popen, PIPE
import pexpect
import threading
import datetime
import urllib
import time









#=================================== Flask functions ==========================================

#Overview for the minecraft server controller.
@app.route("/minecraft", methods=['GET', 'POST'])
#@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def minecraft_overview():

	return render_template("/serverop/mc_overview.html", sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])

	
@app.route("/minecraft/query/<query>", methods=['GET', 'POST'])
def minecraft_query(query):
	
	if(query == 'log_start'): #Get the starting line index (we don't load the entire existing console initially)
		return jsonify(0), 200
	#This is a general purpose query that not only returns the log, but also returns the number of players
	#and the status all in one object to cut down on request numbers.
	elif(query == 'log_query'): 
		index = request.values.get('index', type=int)
		if(index == None):
			return "Need an index", 404
		line_list = []
		try: # It exists if it doesnt break on the 'getattr' part
			log = g[PID_MC]["LOG"]
			line_list = log[index:]
			#Encode every line.
			for x in range(len(line_list)):
				line_list[x] = urllib.quote(line_list[x].encode("utf-8"))
			new_index = len(log)
		except KeyError: # It does not exist
			return jsonify({'status': 'offline'})
		print "Block status: " + str(g[PID_MC]["BLOCK"])
		status = 'online' if p_status(PID_MC) else 'offline'
		
		return jsonify({'status': status, 'new_index': new_index ,'log': line_list}), 200
	elif(query=='status'):
		return jsonify('online' if p_status(PID_MC) else 'offline'), 200
	elif(query=='list'):
		players = p_mc_players()
		players = players if players else 0 # Send zero if problem because 0 is 'falsey' while 'False' is not!
		return jsonify({'players': players}), 200
	
	#Ensure user exists, is logged in, and has correct privilege.
	if(current_user and (not current_user.is_anonymous) and current_user.has_privilege('minecraft')):
		if(query == 'up'):
			print "LAUNCHING SERVER"
			if(p_launch(PID_MC, ARG_MC, LOG_MC, CWD_MC)):
				print "Server starting"
				return jsonify({}), 200
			else:
				print "Server already started"
				return "Process is still alive. 'I'm not dead yet... I want to walk'", 409
		elif(query == 'down'):
			if(p_command(PID_MC, 'stop')):
				return jsonify({}), 200
			else:
				return "Process is dead or busy, command not attempted.", 409
	else:
		return "Admin access required", 403
	
	
#=================================== Serverop Functions =========================================
#We will probably move these to a separate file later.

#A map of all existing processes which are open, their logwatcher threads, and their log arrays
#The process entry will not be deleted from the list when the process exists. The lw thread will close, and
#the log will remain until a new process of the same ID is started, at which point it will be overwritten.
#['BLOCK'] is true or false, and describes if the process is currently waiting (p.expect) for a command to complete.
g = {}

#Constants of ID's for various processes
PID_MC = 'minecraft'
#ARG_MC = ['/usr/bin/java', '-Xmx4096m', '-jar', '/home/v2r/temp_server/forge-1.10.2-12.18.3.2422-universal.jar', '-o', 'nogui']
ARG_MC = '/usr/bin/java -Xmx4096m -jar /home/v2r/temp_server/forge-1.10.2-12.18.3.2422-universal.jar -o nogui'
CWD_MC = '/home/v2r/temp_server/' # The working directory of the minecraft server
LOG_MC = '/var/www/fgnsrv/logs/serverop_proc_mc.log'

#Attempt to get number of players. Will return a string '0', '1', etc, the number of players.
#If process is dead or busy, will return False
def p_mc_players():
	players = p_command_wait(PID_MC, "list", "[a-z]")
	if(players == False or players == None): # Ensure absolute false is returned
		return False
	#TODO parse
	return players


#Launch a process, given an arbitrary string id to retrieve it later and an array of arguments.
#Return True if launched and false if already running or could not launch
def p_launch(pid, arg_arr, log_path, working_dir):
	
	#Ensure process is dead if it's in the dict and still running
	if(p_status(pid)): #Process is not dead yet!
		return False
	else:
		proc = pexpect.spawn(arg_arr, cwd=working_dir)
		lc_thread = LogCatcher(proc, pid)
		lc_thread.start()
		g[pid] = {"P": proc, "LC": lc_thread, "LOG": [], "BLOCK": False}
		return True

#Gets the status of a process (True for Running and False for otherwise)
def p_status(pid):
	try: # It exists if it doesnt break on the 'getattr' part
		return g[pid]["P"].isalive()
	except KeyError: # It does not exist.
		return False
	
#Send a command in string format to the STDIN of the running process
#Return false if process is not running. Return None if the process is busy
def p_command(pid, command):
	if(p_status(pid)):
		print "Block status at command: " + str(g[PID_MC]["BLOCK"])
		if(g[pid]["BLOCK"]):
			return None
		else:
			g[pid]["P"].sendline(command)
			return True
	else:
		return False

#Force kill a running process TODO
def p_kill(pid):
	pass

#This function will pass a command to a process and block the thread until it gets a response which contains the
#text 'text', which it will return. If text=None, it will return the first line of response. If the process
#is not running, None will be returned
#If the process is running but busy, None will be returned
#If the process times out waiting for a return None will be returned.
def p_command_wait(pid, command, text):
	if(p_status(pid)):
		print "STARTING"
		if(g[pid]["BLOCK"]):
			return None
		else:
			ret = None
			try:
				print "BLOCK ON"
				g[pid]["BLOCK"] = True
				g[pid]["P"].sendline(command)
				print "SENT COMMAND '" + command + "' waiting for '" + text + "'"
				print "Nwo, before, after"
				print g[pid]["P"].expect(text)
				print g[pid]["P"].before
				print g[pid]["P"].after
				ret = g[pid]["P"].before
			except pexpect.TIMEOUT:
				pass
			g[pid]["BLOCK"] = False
			print "Done. Returning: "
			print ret
			return ret
	return None

#A class which pretends to be a file. We'll pass this to Popen and it will both save the output of
#the process and allow us a buffer to retrieve commands from. Instantiate with a path to a file to
#write the log to.
class LogCatcher (threading.Thread):
	
	max_buffer_lines = 255
	#file = None
	buffer = []
	
	def __init__(self, proc, pid):
		threading.Thread.__init__(self)
		self.buffer = []
		self.process = proc # The process to watch.
		self.pid = pid
	
	def run(self):
		line = self.process.readline()
		while line:
			if(self.process.isalive()):
			# This is necessary so we don't clear the buffer concurrently while the expect commands complete.
				if(g[self.pid]["BLOCK"]):
					time.sleep(0.1)
				else:
					line = self.process.readline()
					g[self.pid]["LOG"].append(line)
			else:
				break

























