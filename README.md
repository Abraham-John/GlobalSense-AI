# GlobalSense AI: Production Multilingual Sentiment Analysis Platform

**Academic Context:** BCA 5th Semester NLP Capstone Project  
**Repository Architecture:**
- `reference/Movie-Sentiment-Analysis/`: Original reference project (Abraham-John, read-only inspection).
- `Multilingual-Sentiment-Analysis/`: The new production platform (Backend, Frontend, Notebooks, Models, Docs).
- `docs/`: Complete academic documentation suite (Project Report, Literature Review, Presentation Outline, Viva Questions, Original Project Analysis).

---

## Quick Navigation

- 📖 **Project Report:** [docs/Project_Report.md](file:///c:/Users/Administrator/Documents/antigravity/peaceful-carson/docs/Project_Report.md)
- 🔬 **Literature Review:** [docs/Literature_Review.md](file:///c:/Users/Administrator/Documents/antigravity/peaceful-carson/docs/Literature_Review.md)
- 📊 **Presentation Outline (12 Slides):** [docs/Presentation_Outline.md](file:///c:/Users/Administrator/Documents/antigravity/peaceful-carson/docs/Presentation_Outline.md)
- 🔍 **Original Project Analysis:** [docs/Original_Project_Analysis.md](file:///c:/Users/Administrator/Documents/antigravity/peaceful-carson/docs/Original_Project_Analysis.md)
- 💻 **Main Project Codebase:** [Multilingual-Sentiment-Analysis/](file:///c:/Users/Administrator/Documents/antigravity/peaceful-carson/Multilingual-Sentiment-Analysis/)

---

## Verified Empirical Benchmark (2,952 Held-Out Test Samples)

| Model Architecture | Accuracy | Macro-F1 | Weighted-F1 | Precision (M) | Recall (M) | CPU Latency / Sample |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Baseline A (Word TF-IDF + LR)** | 58.60% | 0.5864 | 0.5860 | 0.5878 | 0.5862 | **0.037 ms** |
| **Baseline B (Word + Char n-gram + LR)** | **62.60%** | **0.6245** | **0.6241** | **0.6300** | **0.6240** | **0.499 ms** |
| **BiLSTM (PyTorch 2-Layer)** | 58.06% | 0.5768 | 0.5744 | 0.5833 | 0.5772 | **2.894 ms** |

*All 10 supported languages (`en`, `hi`, `hi-Latn`, `fr`, `es`, `de`, `it`, `pt`, `ar`, `ja`) have $\ge 200$ independently verified test samples.*

---

## Running the Application

### 1. Start FastAPI Backend (Port 8000)
```powershell
cd Multilingual-Sentiment-Analysis\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. Start Vite React Frontend (Port 5173)
```powershell
cd Multilingual-Sentiment-Analysis\frontend
npm.cmd run dev
```

Visit: `http://localhost:5173`
