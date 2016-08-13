// ==Taberareloo==
// {
//   "name"        : "WikiHub Model for RAC Articles"
// , "description" : "Post an article to https://rac.wikihub.io/articles"
// , "include"     : ["background"]
// , "version"     : "0.0.2"
// , "downloadURL" : "https://raw.githubusercontent.com/dlwr/model.wikihub.rac.tbrl.js/master/model.wikihub.rac.tbrl.js"
// }
// ==/Taberareloo==

(function() {

    var NAME = 'Rac';
    var BASE_URL = 'https://rac.wikihub.io';

    Models.register({
        name: NAME + 'WikiHub',
        ICON: BASE_URL + '/favicon.ico',
        LINK: BASE_URL + '/', // used at the services tag in the options page
        LOGIN_URL: BASE_URL + '/', // used at alert messages

        TOKENS_URL: 'https://wikihub.io/settings/tokens', // to generate an access token
        POST_URL: BASE_URL + '/api/v1/articles', // to post an article

        check: function(ps) {
            return /regular|photo|quote|link/.test(ps.type);
        },

        getToken: function() {
            var self = this;

            // for backward-compatibility
            var token = window.localStorage.racWikiHubToken || '';
            if (token) {
                window.localStorage.WikiHubToken = token;
                delete window.localStorage.racWikiHubToken;
            }

            token = window.localStorage.WikiHubToken || '';
            if (!token) {
                token = window.prompt(['WikiHub のアクセストークンを入力して下さい', 'アクセストークンは ' + self.TOKENS_URL + ' で作れます。'].join('\n'), '');
                if (token) {
                    window.localStorage.WikiHubToken = token;
                }
            }
            if (!token) {
                self.LOGIN_URL = self.TOKENS_URL;
                throw new Error(['WikiHub のアクセストークンがありません。', '[ OK ] をクリックすると、投稿元ページと WikiHub のアクセストークンを生成するページが開きます。'].join('\n'));
            }
            self.LOGIN_URL = self.LINK;
            return token;
        },

        post: function(ps) {
            var self = this;
            var title;
            var token = self.getToken();
            var promise;

            switch (ps.type) {
                case 'regular':
                    promise = Promise.resolve(ps.description);
                    break;
                case 'quote':
                    var link = ps.page ? '[' + ps.page + '](' + ps.pageUrl + ')' : ps.pageUrl;
                    promise = Promise.resolve(joinText(['> ' + ps.body, '', link, '', ps.description], '\n\n'));
                    break;
                case 'link':
                    var link = ps.page ? '[' + ps.page + '](' + ps.pageUrl + ')' : ps.pageUrl;
                    promise = Promise.resolve(joinText([link, '', ps.description], '\n\n'));
                    break;
                case 'photo':
                    if (ps.file) {
                        promise = Models['Gyazo'].upload(ps).then(function(url) {
                            var link = '';
                            var image = '![' + ps.item + '](' + url + '.png)';
                            if (ps.pageUrl) {
                                link = ps.page ? '[' + ps.page + '](' + ps.pageUrl + ')' : ps.pageUrl;
                            } else {
                                link = url;
                            }
                            return joinText([image, '', link, '', ps.description], '\n\n');
                        });
                    } else {
                        var image = '![' + ps.item + '](' + ps.itemUrl + ')';
                        var link = ps.page ? '[' + ps.page + '](' + ps.pageUrl + ')' : ps.pageUrl;
                        promise = Promise.resolve(joinText([image, '', link, '', ps.description], '\n\n'));
                    }
                    break;
            }

            if (ps.type === 'regular' || ps.page != ps.item) {
                title = ps.item || ps.description || ps.page;
            } else {
                title = ps.page;
            }

            return promise.then(function(body) {
                var content = {
                    body: body,
                    tag_names_string: ps.tags ? ps.tags.join(',') : null,
                    title: title
                };
                return request(self.POST_URL, {
                    method: 'POST',
                    responseType: 'json',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    sendContent: JSON.stringify(content)
                });
            });
        }
    });

})();
