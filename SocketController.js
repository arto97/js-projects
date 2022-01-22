const mongoose = require('mongoose');
const ErrLog = require('../service/err.log')
const User = mongoose.model('User');
const Game = mongoose.model('Game');
const UserAnswers = mongoose.model('UserAnswers');
const Story = mongoose.model('Story');

exports.Socket = async (socket, io) => {
    socket.on("test", async data => {
        ErrLog(data)
        socket.emit("testServer", {message: 'testServer'})
    })

    socket.on("joinUsers", async (data) => {
        try {
            let game = await Game.findOne({gameId: data.gameId});
            if (!game || !game.active || (game.joinedUsers.length === 7 && !game.joinedUsers.includes(data.userId))) {
                return socket.emit("joinedUsersList", {error: 'Մուտքագրված ID-ն սխալ է'});
            }
            let user = await User.findOne({_id: data.userId});
            if (!user.games.includes(game._id)) {
                await User.findOneAndUpdate(
                    {_id: data.userId},
                    {"$push": {"games": game._id}}
                );
            }
            if (!game.joinedUsers.includes(data.userId)) {
                await Game.findOneAndUpdate(
                    {_id: game._id},
                    {"$push": {"joinedUsers": data.userId}}
                );
            }
            socket.join(data.gameId);
            game = await Game.findOne({_id: game._id});
            let start = false;
            let message = 'Անհրաժեշտ է առնվազն 4 մասնակից խաղն սկսելու համար։ Խնդրում ենք սպասել․․․';
            if (game.joinedUsers.length >= 4) {
                start = true;
            }
            let gameU = await Game.findOne({gameId: data.gameId});
            const users = await Promise.all(gameU.joinedUsers.map(async (usId) => {
                let step;
                const user = await UserAnswers.findOne({userId: usId, gameId: gameU._id});
                if (!user) step = 0;
                else {
                    if (user && user.answers && user.answers.length !== 7) {
                        step = user.answers.length;
                    } else {
                        step = 8;
                    }
                }
                if (gameU.requestedJoinedUsers) {
                    let requestedJoinedUsers = await Promise.all(gameU.requestedJoinedUsers.filter(x => {
                        return x._id.toString() !== usId.toString()
                    }));
                    await Game.findOneAndUpdate(
                        {_id: game._id},
                        {"requestedJoinedUsers": requestedJoinedUsers}
                    );
                }
                const fullName = await User.findOne({_id: usId}).select('fullName');
                return {fullName, step}
            }));
            let requestedJoinedUsers = [];
            gameU = await Game.findOne({gameId: data.gameId});
            if (gameU.requestedJoinedUsers) {
                for (let i = 0; i < gameU.requestedJoinedUsers.length; i++) {
                    requestedJoinedUsers.push({
                        fullName: {
                            _id: gameU.requestedJoinedUsers[i]._id,
                            fullName: gameU.requestedJoinedUsers[i].fullName
                        },
                        step: false
                    });
                }
            }
            io.in(data.gameId)
                .emit("joinedUsersList", {game: gameU, requestedJoinedUsers, joinedUsers: users, start, message});

        } catch (e) {
            ErrLog(e, data.userId)
        }
    });

    socket.on("waitEndGame", async (data) => {
        try {
            socket.join(data.gameId);
            const game = await Game.findOne({gameId: data.gameId});
            let story = [];
            let accept = true;
            const exists = await Story.findOne({gameId: game._id});
            const hostedUser = await User.findById(game.hostedUser);
            await Promise.all(game.joinedUsers.map(async (user) => {
                const usAn = await UserAnswers.findOne({gameId: game._id, userId: user});
                if (!usAn || !usAn.answers || usAn.answers.length !== 7) {
                    accept = false;
                }
            }));
            if (accept) {
                if (!exists) {
                    await new Story({gameId: game._id, createdAt: new Date()}).save();
                }
                if ((exists && exists.stories.length !== game.joinedUsers.length) || !exists) {
                    for (let i = 0; i < game.joinedUsers.length; i++) {
                        for (let j = 0; j < 7; j++) {
                            let k = j + i;
                            if (k >= game.joinedUsers.length) k = k - game.joinedUsers.length;
                            if (k >= game.joinedUsers.length) k = k - game.joinedUsers.length;
                            const userAnswers = await UserAnswers.findOne({
                                gameId: game._id,
                                userId: game.joinedUsers[k]
                            });
                            if (userAnswers && userAnswers.answers && userAnswers.answers.length === 7)
                                story[j] = userAnswers.answers[j].answer;
                        }
                        if (story && story.length && story.length === 7) {
                            let st = story.join(",");
                            await Story.updateOne(
                                {"gameId": game._id},
                                {
                                    "$push": {
                                        "stories": {story: st}
                                    },
                                    updatedAt: new Date()
                                });
                        }
                        story = [];
                    }
                }
            }
            const stories = await Story.findOne({gameId: game._id});
            if (stories && stories.stories && stories.stories.length === game.joinedUsers.length) {
                if (hostedUser.role === 'regular') {
                    await Game.findOneAndUpdate(
                        {_id: game._id},
                        {active: false, updatedAt: new Date()}
                    );
                    io.in(data.gameId).emit("endGame", {success: true});
                } else {
                    if (data.userId.toString() === game.hostedUser.toString()) {
                        socket.emit("endGame", {success: true});
                    } else {
                        socket.emit("endGame", {message: 'Խնդրում ենք սպասել լավագույն պատասխաններին'})
                    }
                }
            } else {
                socket.emit("endGame", {message: "Խնդրում ենք սպասել մինչ բոլոր մասնակիցները կպատասխանեն հարցերին"});
            }
        } catch (e) {
            ErrLog(e, data.userId)
        }
    });

    socket.on("waitBestAnswers", async (data) => {
        try {
            socket.join(data.gameId);
            const game = await Game.findOne({gameId: data.gameId});
            const user = await User.findById(game.hostedUser);
            let best = [];
            if (user.role === 'tvShowMan') {
                const story = await Story.findOne({gameId: game._id});
                for (let i = 0; i < data.bestAnswers.length; i++) {
                    for (let j = 0; j < story.stories.length; j++) {
                        if (story.stories[j]._id == data.bestAnswers[i]) {
                            story.stories[j].best = true;
                            story.stories[j].save({suppressWarning: true});
                            best.push(story.stories[j]);
                        }
                    }
                }
                story.save();
                await Game.findOneAndUpdate(
                    {_id: game._id},
                    {active: false, updatedAt: new Date()}
                );
                io.in(data.gameId).emit("bestAnswers", {success: true});
            }
        } catch (e) {
            ErrLog(e, data.userId)
        }
    });
    socket.on("waitNewGame", async (data) => {
        try {
            socket.join(data.gameId);
            const oldGame = await Game.findOne({gameId: data.gameId});
            const newGame = await Game.findOne({replayGameFrom: oldGame._id});
            const timeDiff = newGame ? new Date().getTime() - newGame.createdAt.getTime() : null;
            let timer = 120000;
            if (!data.timerEnabled && newGame && timeDiff && timeDiff > timer) {
                return io.in(data.gameId).emit("newGame", {hideButton: true});
            } else if (data.timerEnabled || newGame) {
                timeDiff > timer && data.userId.toString() === newGame.hostedUser.toString() ? timer = 0 : timer = Math.floor((timer - timeDiff) / 1000);
                // console.log(timer)
                return io.in(data.gameId).emit("newGame", {timer, newGame});
            }
            return io.in(data.gameId).emit("newGame", {success: true});

        } catch (e) {
            ErrLog(e, data.userId)
        }
    });
};
