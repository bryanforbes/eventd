#!/bin/sh

STARTDIR=$(pwd)
SCRIPTDIR=$(readlink -f "$(dirname $0)")
echo $SCRIPTDIR

DOJO=~/Projects/dojo/trunk/dojo
COMPOSE=~/Projects/compose
EVENTD=~/Projects/eventd

rm -rf "$SCRIPTDIR/dojo"
cd "$DOJO"
git archive --prefix=dojo/ remotes/git-svn | tar -x -C "$SCRIPTDIR"

rm -rf "$SCRIPTDIR/compose"
cd "$COMPOSE"
git archive --prefix=compose/ master | tar -x -C "$SCRIPTDIR"

rm -rf "$SCRIPTDIR/eventd"
cd "$EVENTD"
git archive --prefix=eventd/ master | tar -x -C "$SCRIPTDIR"

cd "$SCRIPTDIR"
rm -r dojo/tests*
rm -r compose/test
rm -r eventd/tests

git add dojo
git add compose
git add eventd

cd "$STARTDIR"
