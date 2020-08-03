set -ex

git pull

npm run build_release

rm -rf ephemeral-live
git clone https://github.com/aneeshdurg/ephemeral ephemeral-live

pushd ephemeral-live
git remote set-url origin git@github.com:aneeshdurg/ephemeral
git checkout gh-pages

rm -r *
cp -r ../dist/* .

git add .
git commit -m Updates --allow-empty
git push origin gh-pages
popd

rm -rf ephemeral-live
