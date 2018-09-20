(function() {
    'use strict';

    jEli
        .jModule('chat.service', ['jEli.Date.Time'])
        .jElement('chatApp', ['$sessionStorage', chatAppFn]);

    //chatAppFn
    function chatAppFn($sessionStorage) {
        return ({
            $init: chatAppLinkFn
        });

        //chatAppLinkFn
        function chatAppLinkFn(ele, attr, model) {
            var $chatUser = "_chat_rec_",
                $db = null,
                $syncService = {},
                $interVal = null,
                $timer = 2000;
            var req = new jEli.jdb('jChatService', 1)
                .isClientMode()
                .open({
                    serviceHost: 'http://localhost:81/api',
                    logService: console.log,
                    live: true
                })
                .onUpgrade(function() {
                    console.log(arguments);
                })
                .onSuccess(function(e) {
                    console.log(e);
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

                this.onError = function() {
                    console.log(ret);
                };
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
                            $syncService
                                .get('chat', { '$hash': list.length })
                                .then(function(res) {
                                    if (res.jDBNumRows()) {
                                        model.chat.chatList.push.apply(model.chat.chatList, res.getResult());
                                        $timer = 2000;
                                    } else {
                                        $timer += 30;
                                    }

                                    setTimeout(poll, $timer);
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
                            if (!res.jDBNumRows()) {
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

                        $db.jQl('insert -' + JSON.stringify(postData) + ' -chat', new queryHandler());

                        chatBox.val('');
                    }
                }

            };

            model.$disconnect = function() {
                $sessionStorage.removeItem($chatUser);
                model.chat.userConnected = false;
            };

            checkActiveUser();
        }
    }
})();