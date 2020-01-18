import os
from flask import Flask, render_template, request, session, jsonify
from flask_socketio import SocketIO, emit, send
from datetime import datetime
import json


def log_bank():
    print('\n\n XXXXXXXXX ----------------------BANK content------------------------XXXXXXXXXXXXXXXXX')
    for k in BANK:
        print('         XXX___________Room : {} ____________'.format(k))
        for e in BANK[k]:
            print(e)
    print('\n\n')

# Configure app
app = Flask(__name__)
app.config["SECRET_KEY"] = 'my secret'

# Configure socketio
socketio = SocketIO(app)

USERS = []
BANK = {}
ROOMS = []


@app.route("/")
def welcome():
    return render_template('welcome.html', users=USERS)


# Login service
@app.route("/login", methods=['POST'])
def login():
    username = request.form.get("username")
    if username == '':
        return render_template('welcome.html', message='Enter a non empty username.')
    else:
        session['username'] = username
        if username not in USERS:
            if len(USERS) >= 100:
                del USERS[0]
            USERS.append(username)

        return render_template('chat.html', username=username)


@socketio.on('roomDeletion')
def deleteRoom(data):
    room_to_delete = data['roomToDelete']
    if room_to_delete not in ROOMS:
        emit('roomDeletion', {'success': 'false'})
    else:
        ROOMS.remove(room_to_delete)
        emit('roomDeletion', 
        {'success': 'true', 'room': room_to_delete, 'rooms': ROOMS},
        broadcast=True)


@socketio.on('roomCreation')
def broadcast_new_room(data):
    created_room = data['room_name']
    if created_room not in ROOMS:
        ROOMS.append(created_room)
        emit('roomCreation', 
        {'success': 'true', 'room_name': created_room, 'rooms': ROOMS}, 
        broadcast=True)
    else:
        emit('roomCreation', 
        {'success': 'false', 'error_msg': 'Room already exists!'})


@socketio.on("message")
def message(data):

    msg = data["msg"]
    username = data["username"]
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    room = data['room']

    # Storing the 100 most recent messages, each message being an object
    if room not in BANK:
        BANK[room] = []
    if len(BANK[room]) >= 100:
        BANK[room].pop(0)
    BANK[room].append(username + ' at ' + timestamp + ' : ' + msg)

    log_bank()

    # broadcast it
    emit('message',
         {'room': room, "username": username, "msg": msg, 'timestamp': timestamp,
          'msgs': BANK[room]}, broadcast=True)

# This is AJAX, not socket IO
@app.route('/room_change', methods=['POST'])
def provide_history_after_roomChange():
    room = request.form.get('room')
    msgsToRender = []
    if room in BANK:
        msgsToRender = BANK[room]
    return jsonify({'msgs': msgsToRender})


@app.route('/user_is_back', methods=['POST'])
def provide_rooms():
    return jsonify({'rooms': ROOMS})


if __name__ == "__main__":
    socketio.run(app, debug=True)

