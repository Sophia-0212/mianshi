from pathlib import Path
import re,json,subprocess,os,concurrent.futures,ast
root=Path.cwd();out=root/'.planning/algorithm-completion/final';out.mkdir(exist_ok=True)
env=os.environ.copy();env['GOROOT']='/opt/homebrew/opt/go/libexec';env['GOTOOLCHAIN']='local'
jobs=[];documents=[]
for folder in ['算法题/04.链表','算法题/高频 中高级力扣题']:
 for f in sorted((root/folder).rglob('*.md')):
  if f.name=='README.md':continue
  s=f.read_text();langs=set()
  for m in re.finditer(r'```(python|go|cpp)\n(.*?)```',s,re.S):
   lang,code=m.groups()
   if (lang=='python' and '__main__' not in code) or (lang=='go' and 'package main' not in code) or (lang=='cpp' and 'int main(' not in code):continue
   langs.add(lang);d=out/f'{len(jobs):03d}';d.mkdir(exist_ok=True)
   src=d/('main.'+{'python':'py','go':'go','cpp':'cpp'}[lang]);src.write_text(code)
   jobs.append((str(f.relative_to(root)),lang,src,d))
  assert langs=={'python','go','cpp'},(str(f),langs)
  documents.append(str(f.relative_to(root)))
def decode(s):
 s=s.strip().rstrip(',')
 try:return json.loads(s)
 except Exception:return ast.literal_eval(s)
def check(job):
 name,lang,src,d=job
 try:
  if lang=='python':cmd=['python3',str(src)]
  elif lang=='go':cmd=['/opt/homebrew/bin/go','run',str(src)]
  else:
   c=subprocess.run(['clang++','-std=c++17',str(src),'-o',str(d/'app')],capture_output=True,text=True,timeout=60)
   if c.returncode:return dict(file=name,lang=lang,ok=False,error=c.stderr[:1500])
   cmd=[str(d/'app')]
  r=subprocess.run(cmd,capture_output=True,text=True,timeout=60,env=env)
  if r.returncode:return dict(file=name,lang=lang,ok=False,error=r.stderr[:1500],output=r.stdout)
  compared=0
  for line in r.stdout.splitlines():
   m=re.search(r'期望=\s*(.*?)\s*实际=\s*(.*)',line)
   if not m:m=re.search(r'expected=(.*?), actual=(.*)',line)
   if m:
    expected,actual=map(decode,m.groups())
    if '0347.' in name:expected,actual=sorted(expected),sorted(actual)
    assert expected==actual,(line,expected,actual)
    compared+=1
  return dict(file=name,lang=lang,ok=True,checked_prints=compared,output=r.stdout)
 except Exception as e:return dict(file=name,lang=lang,ok=False,error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(check,jobs))
report=dict(documents=len(documents),programs=len(results),passed=sum(x['ok'] for x in results),results=results)
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('documents',len(documents),'programs',len(results),'passed',report['passed'])
for r in results:
 if not r['ok']:print(r['file'],r['lang'],r.get('error'),r.get('output',''))
