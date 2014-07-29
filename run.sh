function process_jison() {
	echo "*****************"
	echo "compiling grammar"
	echo "*****************"
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
		else if echo "$event" | grep -q 'myst$'; then
			process_js "$event"
		fi fi
	done
}

fswatch -0 . | change
