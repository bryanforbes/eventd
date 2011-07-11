#!/bin/sh

STARTDIR=$(pwd)
SCRIPTDIR=$(readlink -f "$(dirname $0)")
echo $SCRIPTDIR

DOJO=~/Projects/dojo/trunk/dojo
EVENTD=~/Projects/eventd

rm -rf "$SCRIPTDIR/dojo"
cd "$DOJO"
git archive --prefix=dojo/ master | tar -x -C "$SCRIPTDIR"

rm -rf "$SCRIPTDIR/eventd"
cd "$EVENTD"
git archive --prefix=eventd/ master | tar -x -C "$SCRIPTDIR"

cd "$SCRIPTDIR"
rm -r dojo/tests*
rm -r eventd/tests

git add dojo
git add eventd

cd "$STARTDIR"
