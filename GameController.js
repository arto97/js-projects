const mongoose = require('mongoose');
const Game = mongoose.model('Game');
const User = mongoose.model('User');
const Stadium = mongoose.model('Stadium');
const Chat = mongoose.model('Chat');

exports.GetMyGames = async (req, res) => {
    const games = await Game.find({userId: req.user._id});

    res.send(games);
};

exports.GetAllGames = async (req, res) => {
    const totalCount = await Game.find();
    let limit = Math.abs(req.query.perPage) || totalCount.length;
    let page = (Math.abs(req.query.page) || 1) - 1;
    let search = (req.query.search) || '';
    let orderDirection = (req.query.orderDirection) || 'desc';
    let orderBy = (req.query.orderBy) || 'createdAt';
    try {
        let events;
        console.log(req.query.type)
        switch (req.query.type) {
            case 'completed' :
                events = await Game.find({$or: [{'users.home': {"$in": [req.user._id]}}, {'users.away': {"$in": [req.user._id]}}]}).where({date: {$lte: new Date()}}).where({cancelled: false});
                return res.send({events});
            case 'current':
                events = await Game.find({$or: [{'users.home': {"$in": [req.user._id]}}, {'users.away': {"$in": [req.user._id]}}]})
                    .where({date: {$gte: new Date()}}).where({cancelled: false});
                return res.send({events});
            case 'upcoming' :
                events = await Game.find().where({date: {$gte: new Date()}}).where({cancelled: false});
                return res.send({events});
            default :
                let regex = new RegExp(search, 'i');
                const query = {'name': regex};
                const sorting = {[orderBy]: orderDirection};
                events = await Game.find().sort(sorting).limit(limit).skip(limit * page).where(query).where({cancelled: false});
                return res.send({events, page, totalCount: totalCount.length});
        }
    } catch (e) {
        return res.status(404).send({message: 'Something went wrong!'});
    }
};

exports.GetGamesByName = async (req, res) => {
    const search = req.query.search || '';
    let regex = new RegExp(search, 'i');
    const query = {'name': regex};
    const games = await Game.find(query);
    console.log(games);
    // const rate = await Rating.find({ ratedUserId:users._id });
    return res.send(games);
};

exports.GetGamesById = async (req, res) => {
    let users = {
        home: [],
        away: []
    };
    let games = [];
    if (req.query.id) {
        game = await Game.findById(req.query.id);
        const stadium = await Stadium.findById(game.stadium);
        for (let id of game.users.home) {
            let user = await User.findOne({_id: id});
            users.home.push(user);
        }
        for (let id of game.users.away) {
            let user = await User.findOne({_id: id});
            users.away.push(user);
        }
        let refuse = true;
        if ((!game.users.home.includes(req.user._id) || !game.users.away.includes(req.user._id)) && !req.user.games.includes(game._id)) {
            refuse = false;
        }
        const user = await User.findById(req.user._id);
        let favorite = false;

        if (user.wishList.includes(req.query.id)) {
            favorite = true
        }
        const chat = await Chat.findOne({gameId: req.query.id});
        if (game.userId.toString() === req.user._id.toString()) {
            return res.send({game, stadium, users, chat, cancel: true, favorite});
        } else return res.send({game, stadium, users, chat, refuse, favorite});

    }
    return res.status(401).send({message: 'Something went wrong!'});
};

exports.CreateGame = async (req, res) => {
    const {eventName, dateTime, stadium, gameType} = req.body;
    if (!eventName || !dateTime || !stadium) return res.status(422).send({message: 'You must provide a name, date and stadium'});
    try {
        const stadiumObject = await Stadium.findById(stadium);

        if (req.user.balance < stadiumObject.price) {
            return res.status(422).send({message: `There is no enough money in your account  ${stadiumObject.price - req.user.balance}`});
        }
        const match = new Game({
            name: eventName,
            date: dateTime,
            stadium,
            gameType,
            userId: req.user._id,
            'users.home': [req.user._id],
            createdAt: new Date(),
            updatedAt: new Date()
        });
        await User.update(
            {"_id": req.user._id},
            {
                "$push": {
                    "games": match._id
                },
                "$set": {"balance": req.user.balance - stadiumObject.price}
            }
        );
        await match.save();
        const chat = new Chat({gameId: match._id});
        await chat.save();
        res.send({event: match});
    } catch (e) {
        return res.status(422).send({message: 'Something went wrong'})
    }

};

exports.CancelGame = async (req, res) => {
    try {
        const game = await Game.findById(req.query.id);
        const stadium = await Stadium.findById(game.stadium);
        game.users.home.map(async (userId) => {
            await User.updateOne(
                {"_id": userId},
                {
                    "$pull": {
                        "games": req.query.id
                    },
                    "$set": {"balance": req.user.balance + stadium.price}
                }
            );
        });
        game.users.away.map(async (userId) => {
            await User.updateOne(
                {"_id": userId},
                {
                    "$pull": {
                        "games": req.query.id
                    },
                    "$set": {"balance": req.user.balance + stadium.price}
                }
            );
        });
        game.cancelled = true;
        await game.save();
        return res.send({message: 'Game Cancelled'})
    } catch (e) {
        return res.status(422).send({message: e.errmsg})
    }

};

exports.CheckDate = async (req, res) => {
    const {dateTime} = req.body;
    try {
        const game = await Game.findOne({date: dateTime});
        // console.log(game)
        if (game) {
            return res.status(401).send({message: 'Date is not available'})
        }
        return res.send({message: 'Date is available', success: true})
    } catch (e) {
        return res.status(422).send({message: e.errmsg})
    }

};


exports.makeFavorite = async (req, res) => {
    const {favoriteId} = req.body;
    try {
        const user = await User.findById(req.user._id);
        if (user.wishList.includes(favoriteId)) {
            const index = user.wishList.indexOf(favoriteId);
            user.wishList.splice(index, 1);
            await user.save();
        } else {
            await User.findByIdAndUpdate(
                req.user._id,
                {
                    "$push": {"wishList": favoriteId}
                }
            )
        }
        return res.send({success: true})
    } catch (e) {
        return res.status(422).send({message: 'Համակարգում խնդիր է առաջացել, Խնդրում ենք փորձել մի փոքր ուշ'})
    }
};

exports.getWishListGames = async (req, res) => {
    try {
        const events = [];
        const user = await User.findById(req.user._id);
        for (let id of user.wishList) {
            const game = await Game.findById(id);
            events.push(game);
        }
        return res.send({events})
    } catch (e) {
        return res.status(422).send({message: 'Համակարգում խնդիր է առաջացել, Խնդրում ենք փորձել մի փոքր ուշ'})
    }
};


exports.GetChat = async (req, res) => {
    try {
        const chats = await Chat.findOne({gameId: req.query.id});
        return res.send({chats, userId: req.user._id})
    } catch (e) {
        return res.status(404).send({message: 'Something went wrong!'});
    }
};


exports.GetAllStadiums = async (req, res) => {
    const totalCount = await Stadium.find();
    let limit = Math.abs(req.query.perPage) || totalCount.length;
    let page = (Math.abs(req.query.page) || 1) - 1;
    let search = (req.query.search) || '';
    let orderDirection = (req.query.orderDirection) || 'desc';
    let orderBy = (req.query.orderBy) || 'createdAt';

    try {

        let regex = new RegExp(search, 'i');
        const query = {'name': regex};
        const sorting = {[orderBy]: orderDirection};
        const stadiums = await Stadium.find().sort(sorting).limit(limit).skip(limit * page).where(query);
        return res.send({stadiums, page, totalCount: totalCount.length});
    } catch (e) {
        return res.status(404).send({message: 'Something went wrong!'});
    }
};
