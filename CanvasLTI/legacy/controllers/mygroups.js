/**
 * Created by Dongwook on 2/6/2015.
 */

exports.get = function (req, res) {
    req.session.latestUrl = req.originalUrl;
    res.render('mygroups', {cur_page: 'MyGroups', user: req.user });
};
