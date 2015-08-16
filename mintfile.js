var http = require('http');
var express = require('express');
var formidable = require('formidable');
var fs = require('fs');
var jade = require('jade');
var mysql = require('mysql');
var favicon = require('serve-favicon');
var path = require('path');
var db_data;
fs.readFile('db.json', function(err, resp) {
    if(err) {
        console.log(err);
    }
    else {
        db_data = JSON.parse(resp);
    }
});


var app = express();
app.use(favicon('img/logo.ico'));

//Индекс
app.get('/', function(req, res) {
    jade.renderFile('pages/index.jade', function(err, resp) {
        if(err) {
            res.end(err);
        }
        else {
            res.end(resp);
        }
    });
});

//Загрузка
app.post('/download', function(req, res) {
    var form = new formidable.IncomingForm();
    var db_connect = mysql.createConnection(db_data);
    db_connect.query('SELECT * FROM `files` ORDER BY `id` DESC LIMIT 1', function(err, rows, fields) {
        if(err) {
            jade.renderFile('pages/err_db.jade', function(error, resp) {
                res.end(resp); 
                console.log(err);
            });
        }
        else {
            var numb_file;
            if(rows[0] == '') {
                numb_file = 1;
            }
            else {
                numb_file = rows[0].id + 1;
            }
            fs.mkdir('files/' + numb_file, function() {
                form.uploadDir = 'tmp';
                form.maxFieldsSize = 500 * 1024 * 1024
                form.parse(req, function(errors, fields, files) {
                    if(files.downfile.size > 550000000) {
                        jade.renderFile('pages/err_size.jade', function(error, resp) { res.end(resp); });
                    }
                    else {
                        var size_m = files.downfile.size / 1048576;
                        var size_res = size_m.toFixed(1);
                        var date = curTime();
                        db_connect.query('INSERT INTO `files` (`id`, `name`, `size`, `date`) VALUES (' + numb_file + ', "' + files.downfile.name + '", "' + size_res + '",' + date + ')');
                        fs.rename(files.downfile.path, 'files/' + numb_file + '/' + files.downfile.name, function(err) {
                            if(err) {
                                console.log(err);
                            }
                            else {
                                
                                var jade_var = {
                                    numb: numb_file,
                                    name: files.downfile.name,
                                    size: size_res
                                };
                                jade.renderFile('pages/down_load.jade', jade_var, function(error, resp) {
                res.end(resp);
                                });
                            }
                        });
                    }
                });
            });
        }
    });
});

//Просмотр файла
app.get('/file/:name?', function(req, res) {
    var file_id = req.params.name;
    var re = new RegExp('^[0-9]{1,}$');
    if(re.test(file_id)) {
        var db_connect = mysql.createConnection(db_data);
        db_connect.query('SELECT * FROM `files` WHERE `id` =' + file_id + ' AND `deleted` = 0', function(err, rows, fields) {
            if(err) {
                jade.renderFile('pages/err_db.jade', function(error, resp) {
                    res.end(resp); 
                    console.log(err);
                });
            }
            else if(typeof rows[0] == 'undefined') {
                jade.renderFile('pages/file_err.jade', function(error, resp) {
                    res.end(resp); 
                    db_connect.end();
                });
            }
            else {
                var link_download = encr(rows[0].id);
                var ext = path.extname(rows[0].name).slice(1);
                var ext_addr, ext_id;
                if(ext == 'jpg' || ext == 'png' || ext == 'JPG' || ext == 'PNG' || ext == 'gif' || ext == 'GIF') {
                    ext_addr = '/downloaded_images/' + rows[0].id + '<' + rows[0].name;
                    ext_id = 'pic_img';
                }
                else if(ext == 'rar' || ext == 'zip' || ext == 'tar.gz') {
                    ext_addr = '/source/img/lists/arh';
                    ext_id = 'pic_logo';
                }
                else if(ext == 'mp4' || ext == 'mpg' || ext == 'mpeg' || ext == 'mkv' || ext == 'webm') {
                    ext_addr = '/source/img/lists/video';
                    ext_id = 'pic_logo';
                }
                else {
                    ext_addr = '/source/img/lists/file';
                    ext_id = 'pic_logo';
                }
                var file_data = {
                    numb: rows[0].id,
                    name: rows[0].name,
                    size: rows[0].size,
                    date: timeConv(rows[0].date),
                    down: rows[0].download,
                    down_link: link_download,
                    ext_addr: ext_addr,
                    ext_id: ext_id
                };
                jade.renderFile('pages/file_load.jade', file_data, function(error, resp) {
                    res.end(resp); 
                    db_connect.end();
                });
            }
        });
    }
    else {
        jade.renderFile('pages/file_err.jade', function(error, resp) {
            res.end(resp);
        });
    }
});

//Скачивание файла
app.get('/download/:name?', function(req, res) {
    var file_cod = req.params.name;
    if(typeof file_cod == 'undefined') {
        jade.renderFile('pages/err_nf.jade', function(error, resp) {
            res.end(resp);
        });
    }
    else {
    var file_id = dechip(file_cod);
    var db_connect = mysql.createConnection(db_data);
    db_connect.query('SELECT * FROM `files` WHERE `id` =' + file_id, function(err, rows, fields) {
        if(err) {
            jade.renderFile('pages/err_db.jade', function(error, resp) {
                res.end(resp); 
                console.log(err);
            });
        }
        else {
            fs.readFile('files/' + rows[0].id + '/' + rows[0].name, function(error, resp) {
                res.end(resp);
                db_connect.query('UPDATE `test`.`files` SET `download`=`download` + 1 WHERE `id`="' + file_id + '"');
                db_connect.end();
            });
        }
    });
    }
});

//Ресурсы
app.get('/source/less', function(req, res) {
    fs.readFile('style/less.min.js', function(err, resp) {
        if(err) {
            res.end(err);
        }
        else {
            res.end(resp);
        }
        
    });
});
app.get('/source/jquery', function(req, res) {
    fs.readFile('style/jquery-2.1.3.min.js', function(err, resp) {
        if(err) {
            res.end(resp);
        }
        else {
            res.end(resp);
        }
        
    });
});
app.get('/source/st', function(req, res) {
    fs.readFile('style/st.less', function(err, resp) {
        if(err) {
            res.end(resp);
        }
        else {
            res.end(resp);
        }
        
    });
});
app.get('/source/client', function(req, res) {
    fs.readFile('style/client.js', function(err, resp) {
        if(err) {
            res.end(resp);
        }
        else {
            res.end(resp);
        }
        
    });
});
app.get('/source/img/lists/:name?', function(req, res) {
    var img_name = req.params.name;
    fs.readFile('img/lists/' + img_name +'.png', function(err, resp) {
        if(err) {
            res.end('No image');
        }
        else {
            res.end(resp);
        }
    });
});
app.get('/source/img/:name?', function(req, res) {
    var img_name = req.params.name;
    fs.readFile('img/' + img_name +'.png', function(err, resp) {
        if(err) {
            res.end('No image');
        }
        else {
            res.end(resp);
        }
    });
});
app.get('/downloaded_images/:name?', function(req, res) {
    var img_name = req.params.name;
    var arr_img = img_name.split('<');
    fs.readFile('files/' + arr_img[0] + '/' + arr_img[1], function(err, resp) {
        if(err) {
            res.end('No image');
        }
        else {
            res.end(resp);
        }
    });
});

//Ошибка 404
app.get('*', function(req, res) {
    jade.renderFile('pages/err_nf.jade', function(error, resp) {
        res.end(resp);
    });
});

//Шифровка и дешифровка
function randomInteger(min, max) {
    var rand = min + Math.random() * (max + 1 - min);
    rand = Math.floor(rand);
    return rand;
};
function encr(num) {
    function symbols() {
        var sbl = 'GTHEQUICKBROWNFOXJUMPSOVERTHELAZYDOG';
        for(var i = 0; i < 2; i++) {
            var numeric = randomInteger(0, sbl.length - 1);
            cod += sbl.charAt(numeric);
        };
    };
    var cod = '';
    cod += randomInteger(11, 99);
    symbols();
    cod += randomInteger(11, 99);
    symbols();
    cod += num + 37;
    symbols();
    cod += randomInteger(11, 99);
    symbols();
    cod += randomInteger(11, 99);
    symbols();
    cod += randomInteger(11, 99);
    return cod;
};
function dechip(cod) {
    var res = cod.slice(8, 10);
    var result = +res - 37;
    return result;
};

//Нынешнее время
function curTime() {
    var now = new Date(); 
    var now_utc = Date.parse(now);
    var now_st = String(now_utc);
    var result = now_st.slice(0, -3)
    return result;
};

//Преобразование времени
function timeConv(time) {
    var timeUnix = time + '000';
    var timeJS = new Date(+timeUnix);
    var year = timeJS.getFullYear();
    var mounth = String(timeJS.getUTCMonth() + 1);
    if(mounth.length == 1) {
        mounth = '0' + mounth;
    }
    var day = String(timeJS.getDate());
    if(day.length == 1) {
        day = '0' + day;
    }
    var hour = timeJS.getHours();
    var minute = timeJS.getMinutes();
    var result = day + '.' + mounth + '.' + year + ' ' + hour + ':' + minute;
    return result;
};

//Удаление устаревших файлов
function searchDatedFiles(date) {
    var curTime = date();
    var db_connect = mysql.createConnection(db_data);
    db_connect.query('SELECT * FROM `files` WHERE `deleted` = 0', function(err, rows, fields) {
        var num_files = rows.length;
        for(var i = 0; i < rows.length - 1; i++) {
            if(curTime - rows[i].date > 604800) {
                console.log('(' + rows[i].id + ')' + rows[i].name + '\n');
                deletedFile(rows[i].id, rows[i].name);
            }
            else {
                continue;
            }
        }; 
        db_connect.end();
    });
    console.log('Очистка завершена');
};
function deletedFile(id, name) {
    var db_connect = mysql.createConnection(db_data);
    db_connect.query('UPDATE `files` SET `deleted`=1 WHERE `id`=' + id, function(err, resp) {
        if(err) {
            console.log(err);
        }
        else {
            fs.unlink('files/' + id + '/' + name);
        }
        db_connect.end();
    });
};

//Запуск проверки на устаревание
function checkData() {
    searchDatedFiles(curTime);
};
setInterval(function() {
    checkData();
}, 9600000);

http.createServer(app).listen(81);