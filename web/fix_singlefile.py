import re,sys
p=sys.argv[1]
h=open(p,encoding='utf-8').read()
m=re.search(r'<script type="module"[^>]*>',h)
start=m.end()
end=h.rfind('</script>')
body=h[start:end]
BS=chr(92)
body=body.replace('</script','<'+BS+'/script').replace('<script','<'+BS+'u0073cript').replace('<!--','<'+BS+'u0021--')
open(p,'w',encoding='utf-8').write(h[:start]+body+h[end:])
print("patched")
