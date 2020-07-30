set -ex

cd /home/pi/ephemeral/
su pi -c "bash -i webhook/do_deploy.sh"
