document.addEventListener('DOMContentLoaded', () => {

    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // initializing the content

    const noRoomMsg = 'You are in no room. Start by joining one and/or creating one!';
    const request = new XMLHttpRequest();
    request.open('POST', '/user_is_back');
    request.send();

    request.onload = () => {

        const response = JSON.parse(request.responseText);
        const rooms = response.rooms;
        loadRooms(rooms);

        if (localStorage.getItem('currentRoom_' + username)) {

            // user is in an existing room, it is OK
            if (rooms.includes(localStorage.getItem('currentRoom_' + username))) {
                document.querySelector('#room-name').innerHTML = localStorage.getItem('currentRoom_' + username);
                loadMessages();
            }

            // room does not exist anymore
            else {
                localStorage.removeItem('currentRoom_' + username);
                document.querySelector('#room-name').innerHTML = noRoomMsg;
            }
        }
        else {
            document.querySelector('#room-name').innerHTML = noRoomMsg;
        }
    }

    // sending deleting room Socket IO notification to the server
    document.querySelector('#submit-room-deletion').onclick = () => {
        console.log('sending to server -- a room is to be deleted');
        const roomToDelete = document.querySelector('#to-be-deleted-room-name').value;
        document.querySelector('#to-be-deleted-room-name').value = '';
        socket.emit('roomDeletion', {
            'roomToDelete': roomToDelete
        });
    }

    // receiving server notification after deleting room
    socket.on('roomDeletion', data => {
        console.log('reiciving from server -- a room is to be deleted');
        if (data.success === 'true') {
            loadRooms(data.rooms);

            if (data.room === localStorage.getItem('currentRoom_' + username)) {
                localStorage.removeItem('currentRoom_' + username);
                document.querySelector('#room-name').innerHTML = 'Your room has been deleted. Join/create another one';
                document.querySelector('#display-message-section').innerHTML = '';
            }
        }
    })

    // Sending message to the server by Socket IO
    document.querySelector('#send_message').onclick = () => {

        if (localStorage.getItem('currentRoom_' + username)) {
            socket.emit('message', {
                'msg': document.querySelector('#user_message').value,
                'username': username,
                'room': localStorage.getItem('currentRoom_' + username)
            });
        }
        else {
            alert('You must be in a room to send a message');
        }
        document.querySelector('#user_message').value = '';
    };

    // Receiving message from the server
    socket.on('message', data => {

        if (data.room === localStorage.getItem('currentRoom_' + username)) {
            document.querySelector('#display-message-section').innerHTML = '';
            var msgs = data.msgs;
            msgs.forEach(msg => {
                msgItem = document.createElement('p');
                msgItem.innerHTML = msg;
                document.querySelector('#display-message-section').append(msgItem);
            })
        }
    });

    // Sending Room Creation Socket IO Notification
    document.querySelector('#submit-new-room').onclick = () => {

        if (document.querySelector('#new-room-name').value.length > 0) {
            socket.emit('roomCreation', {
                'room_name': document.querySelector('#new-room-name').value
            })

            document.querySelector('#new-room-name').value = '';
        }
        else {
            alert('Enter a non empty room name!')
        }
    };

    // Receiving Room Creation notification
    socket.on('roomCreation', data => {
        if (data.success == 'false') {
            alert(data.error_msg)
        }
        else {
            loadRooms(data.rooms);
        }
    })

    // Make 'enter' key submit message
    let msg = document.getElementById("user_message");
    msg.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            document.getElementById("send_message").click();
        }
    });

    // Make 'enter' key submit new rooom
    let roomToBeCreated = document.getElementById("new-room-name");
    roomToBeCreated.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            document.getElementById("submit-new-room").click();
        }
    });

    // Make 'enter' key submit new rooom
    let roomToBeDeleted = document.getElementById("to-be-deleted-room-name");
    roomToBeDeleted.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            document.getElementById("submit-room-deletion").click();
        }
    });
});

function loadRooms(rooms) {

    document.querySelector('#list-of-rooms').innerHTML = '';

    // displaying the room list
    rooms.forEach(room => {
        roomItem = document.createElement('p');
        roomItem.innerHTML = room;
        roomItem.setAttribute('class', 'select-room');

        // add the onclick property
        roomItem.onclick = () => {

            // If user is not in room
            if (room !== localStorage.getItem('currentRoom_' + username)) {
                localStorage.setItem('currentRoom_' + username, room);

                // emptying the window and loading the messages of the room
                document.querySelector('#display-message-section').innerHTML = '';
                document.querySelector('#room-name').innerHTML = localStorage.getItem('currentRoom_' + username);
                loadMessages();
            }
            else {
                alert(`You are already in room ${room}`)
            }
        };

        document.querySelector('#list-of-rooms').append(roomItem);
    })
}

// AJAX
function loadMessages() {

    const request = new XMLHttpRequest();
    request.open('POST', '/room_change');

    request.onload = () => {
        // Reinitialize the content, before adding the messages
        document.querySelector('#display-message-section').innerHTML = '';

        const response = JSON.parse(request.responseText)
        const msgs = response.msgs;
        msgs.forEach(msg => {
            msgItem = document.createElement('p');
            msgItem.innerHTML = msg;
            msgItem.setAttribute('class', 'msg');
            document.querySelector('#display-message-section').append(msgItem);
        })
    }

    const data = new FormData();
    data.append('room', localStorage.getItem('currentRoom_' + username));
    request.send(data);
    return false;
}
