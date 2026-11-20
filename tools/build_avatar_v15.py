"""Build one selectable, self-contained V15 profile with a reproducible V14 core."""
import sys,runpy,argparse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import avatar_v14_common as common
from avatar_v15_profiles import PROFILES
p=argparse.ArgumentParser();p.add_argument('--profile',choices=PROFILES,default='male-balanced');p.add_argument('--views',default='none')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
common.OUT=common.ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions'/a.profile
common.OUT.mkdir(parents=True,exist_ok=True)
sys.argv=[__file__,'--','--views',a.views,'--profile',a.profile]
runpy.run_path(str(Path(__file__).with_name('build_avatar_v14.py')),run_name='__main__')
