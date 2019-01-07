
var glob = require('glob');
var fs = require('fs');
var mkdirp = require('mkdirp');
var showdown  = require('showdown');

var converter = new showdown.Converter({
});

function makeHTML(content) {
    var text = `<!DOCTYPE html>
    <html>
    <head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1'>
    <link rel='stylesheet' type='text/css' href='github-markdown.css'>
    <style>
	.markdown-body {
		box-sizing: border-box;
		min-width: 200px;
		max-width: 980px;
		margin: 0 auto;
		padding: 45px;
	}

	@media (max-width: 767px) {
		.markdown-body {
			padding: 15px;
		}
	}
    </style>
    </head>
    <body class="markdown-body">`;
    text += converter.makeHtml(content);
    text += "</body></html>";
    return text;
}

function convertFile(file) {
    fs.readFile(file, function (err, data) {
        if (err) {
            console.log(err);
        } else {
            var htmlFile = file.substring(4, file.length - 3) + ".html";
            var content = data.toString();
            fs.writeFile("build/" + htmlFile, makeHTML(content), function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("The file '" + htmlFile + "' was saved!");
            }); 
        }
    });
}

function copyFile(file) {
    var destFile = "build/" + file.substring(4);
    fs.copyFile(file, destFile, (err) => {
        if (err) throw err;
    });
}

function searchFiles(pattern, processFile) {
    glob(pattern, function (err, files) {
        if (err) {
            console.log(err);
        } else {
            files.forEach(function (file) {
                processFile(file);
            });;
        }
    });
}

mkdirp('build', function(err) { 
    searchFiles('src/**/*.md', convertFile);
    searchFiles('src/**/*.png', copyFile);
    searchFiles('src/github-markdown.css', copyFile);
});