(function() {
    'use strict';
    jEli
        .jModule('Todo', {
            delimiter: ['${', '}'],
            requiredModules: []
        })
        .jController('todoController', todoControllerFn);

    function todoControllerFn($rootModel) {
        $rootModel.keys = [2];
        $rootModel.removeKey = function(key) {
            $rootModel.keys.splice(key, 1);
        };

        this.pageHeading = "My First Todo App";
        this.todos = [];
        this.removeItemCount = 0;
        this.addTodo = function() {
            if (this.todoDescription) {
                this.todos.push({ description: this.todoDescription, done: false });
                this.todoDescription = "";
            }
        };

        this.removeTodo = function(todo) {
            if (this.todos[index]) {
                this.todos.splice(index, 1);
            }
        };

        this.markAsRemoved = function(force) {
            if (force) {
                this.removeItemCount++;
            } else {
                this.removeItemCount--;
            }
        };

        this.generateMock = function(total) {
            var data = [];
            for (var i = 0; i < total; i++) {
                data.push({ description: "Test_From_" + i, done: false });
            }

            this.todos = data;
            data = null;
        };

        this.todoDescription = "";
    }
})();