#untether.py
#
#This is a very simple service which provides a lightweight mobile way to take, view, and edit notes.
#Copyright (C) 2017  Joshua Reed
#This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.


from the_root.extensions import db, csrf
from the_root import app
from the_root.forms import TransactionForm
from the_root.models import UntetherNote, UntetherCat
from the_root.decorators import render_template_standard

import flask
from flask_login import login_required, current_user

from flask import render_template, redirect, request, jsonify, current_app

import datetime
import urllib

@app.route("/note", methods=['GET', 'POST'])
@app.route("/untether", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def untether():
	return render_template_standard("/untether/list.html")

@app.route("/note/e/<note>", methods=['GET', 'POST'])
@app.route("/untether/e/<note>", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def untether_edit(note):
	return render_template_standard("/untether/edit.html", name=note, type='edit')
	
@app.route("/note/n/<note>", methods=['GET', 'POST'])
@app.route("/untether/n/<note>", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def untether_new(note):
	return render_template_standard("/untether/edit.html", name=note, type='new')

# The interface for accessing public notes.
@app.route("/note/pub/<noteid>", methods=['GET', 'POST'])
@app.route("/untether/pub/<noteid>", methods=['GET', 'POST'])
def untether_public(noteid):
	note = UntetherNote.query.filter_by(id=noteid).first()
	if (not note) or (not (note.pub == 1)):
		text = ""
		name = "The Communist Manifesto"
		code = 403
	else:
		text = urllib.unquote(note.getText())
		code = 200
		name = note.name
	return render_template_standard("/untether/public.html", title=name, text=text, code=code)

@app.route("/misc/marx/manifesto", methods=['GET', 'POST'])
def marx_manifesto():
	fname = current_app.config['STATIC_CONTENT_ROOT'] + '/misc/the_communist_manifesto.txt'
	print fname
	try:
		with open(fname, 'r') as file:
			return file.read()
	except IOError:
		return ''

	
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
		data = note.getDict()
		data['public_url_base'] = UntetherNote.getPublicURLBase()
		return jsonify(data), 200
	elif(query=='cat_create'):
		name = request.values.get('name', type=str)
		if(name == None or (name == '')):
			return "No name provided", 404
		cat = UntetherCat(name, current_user.id, None)
		db.session.add(cat)
		db.session.commit()
		return jsonify(cat.getDict()), 200
	elif(query=='cat_del'):
		id = request.values.get('id', type=int)
		if(id == None):
			return "No valid ID provided", 404
		cat = UntetherCat.query.filter_by(id=id).first()
		if (not cat) or (not (cat.user == current_user.id)):
			return "User does not have access to this category", 403
		db.session.delete(cat)
		db.session.commit()
		return jsonify({}), 200
	elif(query=='cat_rename'):
		id = request.values.get('id', type=int)
		name = request.values.get('name', type=str)
		if(id == None or not name):
			return "No valid ID provided and/or no name provided.", 404
		cat = UntetherCat.query.filter_by(id=id).first()
		if (not cat) or (not (cat.user == current_user.id)):
			return "User does not have access to this category", 403
		cat.name = name
		db.session.commit()
		return jsonify({}), 200
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
		enc = request.values.get('enc', type=int) # Should be 1 or 0 to indicate encrypted or not.
		if((text == None) or (enc == None)):
			return "Missing metadata", 404
		note.enc = enc
		note.setText(text)
		db.session.commit()
		return jsonify({}), 200
	elif(query=='note_move'):
		new_cat_id = request.values.get('new_cat_id', type=int)
		note.cat = new_cat_id
		print "Set to " + str(new_cat_id)
		db.session.commit()
		return jsonify({}), 200
	elif(query=='note_del'):
		db.session.delete(note)
		db.session.commit()
		return jsonify({}), 200
	elif(query=='note_set_public'):
		status = request.values.get('status', type=int) # Should be 1 or 0 to indicate public or not.
		if(status == None):
			return "Missing metadata", 404
		note.pub = status
		print "Status is now " + str(status)
		db.session.commit()
		return jsonify({}), 200
		

	return '', 404