#!/bin/sh

STARTDIR=$(pwd)
SCRIPTDIR=$(readlink -f "$(dirname $0)")
echo $SCRIPTDIR

DOJO=~/Projects/dojo/trunk/dojo
EVENTD=~/Projects/eventd

cd "$DOJO"
git archive --prefix=dojo/ master | tar -x -C "$SCRIPTDIR"

cd "$EVENTD"
git archive --prefix=eventd/ master | tar -x -C "$SCRIPTDIR"

cd "$SCRIPTDIR"
rm -r dojo/tests*
rm -r eventd/tests

git add dojo
git add eventd

cd "$STARTDIR"
