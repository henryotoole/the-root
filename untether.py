#untether.py
#
#This is a very simple service which provides a lightweight mobile way to take, view, and edit notes.
#Copyright (C) 2017  Joshua Reed
#This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.


from the_root.extensions import db, csrf
from the_root import app
from the_root.forms import TransactionForm
from the_root.models import UntetherNote, UntetherCat

import flask
from flask_login import login_required, current_user

from flask import render_template, redirect, request, jsonify

import datetime
import urllib

@app.route("/note", methods=['GET', 'POST'])
@app.route("/untether", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def untether():
	return render_template("/untether/list.html", sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])

@app.route("/note/e/<note>", methods=['GET', 'POST'])
@app.route("/untether/e/<note>", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def untether_edit(note):
	return render_template("/untether/edit.html", name=note, type='edit', sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])
	
@app.route("/note/n/<note>", methods=['GET', 'POST'])
@app.route("/untether/n/<note>", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def untether_new(note):
	return render_template("/untether/edit.html", name=note, type='new', sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])
	
@csrf.exempt # This is added to allow post commands to access this method.
@app.route("/untether/query/<query>", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def untether_query(query):
	form = TransactionForm()
	
	if(query=='user_notes'): # Get a JSON list of all id's and titles
		list = []
		notes = UntetherNote.query.filter_by(user=current_user.id)
		for note in notes:
			list.append(note.getDict())
		return jsonify(list), 200
	elif(query=='user_cats'): # Get a JSON list of all category id's and names
		list = []
		cats = UntetherCat.query.filter_by(user=current_user.id)
		for cat in cats:
			list.append(cat.getDict())
		return jsonify(list), 200
	elif(query=='note_make'): # Create a new note. Need a name. If the name provided is not unique to the user (x) is appended
		name = request.values.get('name', type=str)
		cat = request.values.get('cat', type=int) # Allowed to be None
		text = request.values.get('text', type=str) # Allowed to be None. This will be an escaped string.
		if(name == None or (name == '')):
			return "No name provided", 404
		while UntetherNote.query.filter_by(user=current_user.id).filter_by(name=name).first(): # If the name matches another.
			try:
				first = name.split(')')
				if first[len(first) - 1] == '': # Ensure the last character was a ')'
					list2 = first[len(first) - 2].split('(') # Split the bulk of the string
					num = int(list2[len(list2) - 1]) + 1 # Get the integer value in the parenthesis
					name = name[0:name.rfind('(')] + '(' + str(num) + ')' # Join all but the last two pieces of the first split and add (x)
			except ValueError: # There were parenthesis in the name, but not a (x) at the end.
				name = name + '(0)' # Add (0)
		note = UntetherNote(name, current_user.id, cat)
		db.session.add(note)
		db.session.commit()
		note.setText(text if text else "")
		return jsonify({'name': name, 'id': note.id}), 200
	elif(query=='note_info'): # Gets the info of a note based on its name and the current logged in user.
		name = request.values.get('name', type=str)
		if(name == None or (name == '')):
			return "No name provided", 404
		note = UntetherNote.query.filter_by(user=current_user.id).filter_by(name=name).first()
		if not note:
			return "No note of that name", 404
		return jsonify(note.getDict()), 200
		
	#Queries after this point all rely on a note object which is validated to the user
	id = request.values.get('id', type=int)
	if(id == None):
		return "No valid ID provided", 404
	note = UntetherNote.query.filter_by(id=id).first()
	if (not note) or (not (note.user == current_user.id)):
		return "User does not have access to this note", 403
	
	if(query=='note_get'):
		return jsonify({'text': note.getText(), 'id': id}), 200
	elif(query=='note_set'):
		text = request.values.get('text', type=str) # The text, escaped before sending.
		if(text == None):
			return "No valid text provided", 404
		note.setText(text)
		return jsonify({}), 200
	elif(query=='note_del'):
		db.session.delete(note)
		db.session.commit()
		return jsonify({}), 200
		

	return '', 404