"""
GlobalSense AI - End-to-End Multilingual Sentiment & Translation Benchmark
Tests all 10 target languages, measuring cold translation latency, cache hit latency, and Hinglish handling.
"""

import json
import urllib.request
import time

test_cases = [
    ('en', 'This is an outstanding product and I love using it every day.'),
    ('hi-Latn', 'ye movie sach me bohot acchi thi yaar acting zabardast thi'),
    ('fr', 'Ce restaurant etait tout simplement incroyable et le service etait parfait.'),
    ('es', 'Esta pelicula fue una experiencia realmente maravillosa y conmovedora.'),
    ('de', 'Das Produkt funktioniert einwandfrei und die Lieferung war extrem schnell.'),
    ('it', 'Questo posto e assolutamente fantastico e il cibo e delizioso.'),
    ('pt', 'O servico foi incrivel e a equipe foi muito atenciosa e prestativa.'),
    ('ar', 'هذا الفيلم رائع ومؤثر للغاية واستمتعت به.'),
    ('ja', 'この作品は本当に素晴らしくて、心から感動いたしました。'),
    ('hi', 'यह फ़िल्म बहुत ही सुंदर और भावनात्मक है।'),
]

header = f"{'LANG':<8} | {'SENTIMENT':<10} | {'CONF':<6} | {'STATUS':<14} | {'1ST LAT (ms)':<12} | {'CACHE LAT (ms)':<14} | {'TRANSLATION / MSG'}"
print(header)
print("-" * len(header))

for lang, text in test_cases:
    payload = json.dumps({'text': text, 'language_override': lang, 'explain': False, 'translate': True}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/api/analyze', data=payload, headers={'Content-Type': 'application/json'}, method='POST')
    
    # 1. First call (cold / cache miss)
    resp = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    t_info = resp.get('translation', {})
    lat1 = t_info.get('latency_ms', 0)
    
    # 2. Second call (cache hit)
    resp2 = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    t_info2 = resp2.get('translation', {})
    lat2 = t_info2.get('latency_ms', 0)
    
    trans_text = t_info.get('text') if t_info.get('status') == 'success' else t_info.get('message', '')
    snippet = str(trans_text)[:45]
    
    print(f"{lang:<8} | {resp['sentiment']:<10} | {resp['confidence']:<6.3f} | {t_info.get('status'):<14} | {lat1:<12.1f} | {lat2:<14.1f} | \"{snippet}\"")
