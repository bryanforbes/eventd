#!/bin/sh

STARTDIR=$(pwd)
SCRIPTDIR=$(dirname $0)

DOJO=~/Projects/dojo/trunk/dojo
EVENTD=~/Projects/eventd

cd "$DOJO"
git archive --prefix=dojo/ master | tar -x -C "$SCRIPTDIR"

cd "$EVENTD"
git archive --prefix=eventd/ master | tar -x -C "$SCRIPTDIR"
rm -r eventd/tests

cd "$STARTDIR"
