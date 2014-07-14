# fswatch -0 lib | while read -d "" event; do
#   echo $event
#   echo "change!"
# done

function process_jison() {
	jison $1 -o "$(dirname $1)/$(basename $1 '.jison').js"
}

function process_js() {
	echo ""
	echo ""
	echo "**************************************************"
	date
	node test/test.js
}

function change() {
    while read -d "" event; do
		if echo "$event" | grep -q 'jison$'; then
			process_jison "$event"
		else if echo "$event" | grep -q 'js$'; then
			process_js "$event"
		fi fi
	done
}

fswatch -0 lib | change


# mkfifo pipe
 # cat pipe | cat # grep 'jison$' | cat
# fswatch -0 lib | cat # tee pipe | grep 'js$' | cat

# clear
# date
# jison lib/compiler/parser.jison -o lib/compiler/parser.js
# node test/test.js
