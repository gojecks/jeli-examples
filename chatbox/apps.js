(function() {
    'use strict';

    jEli
        .jModule('chat.service', ['jEli.Date.Time'])
        .jFactory('server', serverFn)
        .jElement('chatApp', ['$sessionStorage', 'server', chatAppFn]);

    //chatAppFn
    function chatAppFn($sessionStorage, server) {
        return ({
            $init: chatAppLinkFn
        });

        //chatAppLinkFn
        function chatAppLinkFn(ele, attr, model) {
            var $chatUser = "_chat_rec_",
                $db = null,
                $syncService = {},
                $interVal = null,
                $timer = 2000,
                _socket = null;

            var req = new jEli.jdb('jChatService', 1)
                .isClientMode()
                .open({
                    logService: console.log,
                    live: true,
                    $ajax: server.request
                })
                .onUpgrade(function(res) {
                    $db = res.result;
                    createTable();
                })
                .onSuccess(function(e) {
                    //set DB
                    $db = e.result;
                    $syncService = $db
                        .synchronize()
                        .Entity()
                        .configSync({});
                })
                .onError(console.log);

            function queryHandler() {
                this.onSuccess = function(ret) {
                    switch (ret.state) {
                        case ("insert"):
                        case ("sync"):

                            break;
                        case ('select'):

                            break;
                    }
                };

                this.onError = function(ret) {
                    console.log(ret);
                };
            }

            /**
             * create our chat table
             */
            function createTable() {
                $db
                    .createTbl('chat')
                    .onSuccess(function(e) {
                        var tbl = e.result;
                        tbl
                            .Alter
                            .add
                            .column('id', { AUTO_INCREMENT: 1, type: 'INT' })
                            .column("message", { type: "TEXT" })
                            .column("time", { type: "DATETIME" })
                            .column("user", { type: "VARCHAR" });
                    })
                    .onError(console.log);
            }

            function checkActiveUser() {
                if ($sessionStorage.getItem($chatUser)) {
                    model.chat.username = $sessionStorage.getItem($chatUser);
                    model.chat.userConnected = true;
                    $db.jQl('select -* -chat', {
                        onSuccess: function(ret) {
                            model.chat.chatList = ret.getResult();
                        },
                        onError: function(ret) {
                            console.log(ret);
                        }
                    });

                    function poll() {
                        //set interval
                        if (model.chat.userConnected) {
                            var list = model.chat.chatList;
                            var ls = localServer();
                            (new server.socket(ls))
                            .connect({
                                domain: 'localhost',
                                port: 3000
                            }, function(socket) {
                                _socket = socket;
                                ls.onDestroy(function() {
                                    socket.emit('user.disconnected', {
                                        user: model.chat.username
                                    });
                                });

                                socket
                                    .emit('user.connected', {
                                        user: model.chat.username
                                    })
                                    .on('new.message', function(e) {
                                        model.chat.chatList.push(e._data);
                                        model.$consume();
                                    })
                                    .on('user.typing', function(e) {
                                        model.chat.typing = e._data;
                                        model.$consume();
                                    });


                                socket.on('server.destroyed', function(eData) {
                                    alert('Server Instance is destroyed');
                                });

                                socket.on('server.reconnected', function() {
                                    socket.emit('user.reconnected', {
                                        user: model.chat.username
                                    })
                                });
                            });
                        }
                    }

                    poll();

                }
            }

            function connectUser() {
                $sessionStorage.setItem($chatUser, model.chat.username);
                checkActiveUser();
            }

            model.chat = {
                username: "",
                userConnected: false,
                chatList: []
            };

            //create function
            model.$create = function() {
                if (model.chat.username) {
                    var users = $db._users();
                    users.isExists({ key: model.chat.username })
                        .then(function(res) {
                            if (!res.isExists) {
                                users
                                    .add({ key: model.chat.username, password: '_null' })
                                    .onSuccess(function(res) {
                                        if (res.ok) {
                                            connectUser();
                                        }
                                    })
                                    .onError(function(res) {

                                    })
                            } else {
                                connectUser();
                            }
                        }, connectUser);
                }
            };


            model.$postChat = function($ev) {
                var chatBox = jEli.dom($ev.currentTarget);
                if ($ev.keyCode === 13) {
                    if (chatBox.length && chatBox.val()) {
                        var postData = [{
                            message: chatBox.val(),
                            time: +new Date,
                            user: model.chat.username
                        }];

                        $db.jQl('insert -%data% -chat', new queryHandler(), {
                            data: postData
                        });

                        model.chat.chatList.push(postData[0]);
                        chatBox.val('');
                        _socket.broadcast('user.typing', {
                            user: false
                        });
                        _socket.broadcast('new.message', postData[0]);

                    }
                } else {
                    _socket.broadcast('user.typing', {
                        user: model.chat.username
                    });
                }
            };

            model.$disconnect = function() {
                $sessionStorage.removeItem($chatUser);
                model.chat.userConnected = false;
            };

            checkActiveUser();
        }
    }

    /**
     * server fn
     */
    function serverFn() {
        var server = new jHttp({});
        var app = new server.app();

        server.interceptor
            .set({
                type: 'response',
                handler: function(request) {}
            });
        /**
         * register request
         */
        app.get('/user/exists', function(instance) {
            instance.res.status(200).responseText({ data: { isExists: true } }).exit();
        });

        app.get('/query', function(instance) {
            instance.res.status(200).responseText({ data: { _rec: [] } }).exit();
        })

        app.put('/state/push', function(instance) {
            instance.res.status(200).responseText({ data: { ok: true } }).exit();
        });

        return server;
    }
})();