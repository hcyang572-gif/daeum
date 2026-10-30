# -*- coding: utf-8 -*-
"""S10j-2 내려받기 파일을 «실제 프로그램으로 열어» 확인한다(⚙️ 파로, 2026-10-30).
  python shared/office_check.py <파일.xlsx|파일.hwpx> [pdf저장폴더]
  xlsx: Microsoft Excel(COM)로 열어 시트·인쇄 설정(A4·방향·한 쪽 너비·머리행 반복·바닥글)·틀 고정·자동 필터·수식 수를 보고,
        «읍면별» 첫 줄 명단을 +10 고친 뒤 다시 계산해 합계·접촉률·요약 시트가 따라 바뀌는지 잰다. PDF로 내보내 쪽 수를 센다.
  hwpx: 한컴오피스 한글(COM)로 열어 본문 글(제목·Ⅰ~Ⅴ·끝.·합계 값)을 읽고 PDF로 저장해 쪽 수·쪽 번호(- n -)를 확인한다.
  창은 띄우지 않는다. 한글은 보안 모듈(FilePathCheckDLL) 등록이 필요하다(05_서식조판 스크립트와 같음)."""
import os, sys, json
sys.stdout.reconfigure(encoding="utf-8")
import win32com.client as w


def pdf_pages(p):
    import fitz
    d = fitz.open(p); n = d.page_count
    foot = [d[i].get_text().strip().splitlines()[-1:] for i in range(n)]
    sizes = [(round(d[i].rect.width), round(d[i].rect.height)) for i in range(n)]
    d.close(); return n, foot, sizes


def check_xlsx(path, outdir):
    xl = w.DispatchEx("Excel.Application"); xl.Visible = False; xl.DisplayAlerts = False
    r = {"sheets": []}
    try:
        wb = xl.Workbooks.Open(os.path.abspath(path), 0, False)
        for ws in wb.Worksheets:
            ps = ws.PageSetup
            ws.Activate(); win = xl.ActiveWindow
            nf = 0
            ur = ws.UsedRange
            for c in ur.Cells:
                if c.HasFormula: nf += 1
            r["sheets"].append({"name": ws.Name, "paper": ps.PaperSize, "orient": "가로" if ps.Orientation == 2 else "세로",
                                "fitWide": ps.FitToPagesWide, "fitTall": ps.FitToPagesTall, "zoom": ps.Zoom, "printTitle": ps.PrintTitleRows,
                                "footer": ps.CenterFooter, "freeze": bool(win.FreezePanes), "filter": bool(ws.AutoFilterMode), "formulas": nf})
        names = [s.Name for s in wb.Worksheets]
        if "읍면별" in names:
            ws = wb.Worksheets("읍면별")
            last = ws.Cells(ws.Rows.Count, 1).End(-4162).Row  # xlUp
            tot = None
            for rr in range(5, last + 1):
                if ws.Cells(rr, 1).Value == "합계": tot = rr
            b5 = ws.Cells(5, 2).Value; t0 = ws.Cells(tot, 2).Value; rate0 = ws.Cells(tot, 4).Value
            k0 = wb.Worksheets("요약").Range("B9:B10").Value
            ws.Cells(5, 2).Value = b5 + 10; xl.CalculateFull()
            t1 = ws.Cells(tot, 2).Value; rate1 = ws.Cells(tot, 4).Value; k1 = wb.Worksheets("요약").Range("B9:B10").Value
            r["edit"] = {"B5": [b5, b5 + 10], "합계": [t0, t1], "합계 접촉률": [rate0, rate1], "합계칸 수식": ws.Cells(tot, 2).Formula,
                         "요약 B9:B10": [k0, k1], "요약 수식": [wb.Worksheets("요약").Range("B9").Formula, wb.Worksheets("요약").Range("B10").Formula],
                         "따라 바뀜": t1 == t0 + 10 and k1[0][0] == t1 and rate1 != rate0}
            ws.Cells(5, 2).Value = b5; xl.CalculateFull()
        if outdir:
            pdf = os.path.join(outdir, os.path.splitext(os.path.basename(path))[0] + "_xlsx.pdf")
            wb.ExportAsFixedFormat(0, pdf)
            n, foot, sizes = pdf_pages(pdf); r["pdf"] = {"pages": n, "sizes": sorted(set(sizes)), "lastLines": foot[:3]}
        wb.Close(False)
    finally:
        xl.Quit()
    return r


def check_hwpx(path, outdir):
    h = w.gencache.EnsureDispatch("HWPFrame.HwpObject")
    h.RegisterModule("FilePathCheckDLL", "FilePathCheckerModuleExample")
    r = {}
    try:
        r["open"] = bool(h.Open(os.path.abspath(path), "HWPX", "forceopen:true"))
        txt = h.GetTextFile("TEXT", "") or ""
        r["chars"] = len(txt); r["head"] = txt.strip().splitlines()[:3]
        r["has"] = {k: (k in txt) for k in ["Ⅰ. 개요", "Ⅴ. 향후 계획", "끝.", "데이터 출처", "합계", "□ ", "○ "]}
        r["pageCount"] = h.PageCount
        if outdir:
            pdf = os.path.join(outdir, os.path.splitext(os.path.basename(path))[0] + "_hwpx.pdf")
            a = h.HAction; ps = h.HParameterSet.HFileOpenSave  # SaveAs(..,"PDF") 는 숨은 대화상자에서 멈춘다(10-30 실측) → FileSaveAsPdf
            a.GetDefault("FileSaveAsPdf", ps.HSet); ps.filename = pdf; ps.Format = "PDF"; ps.Attributes = 0; a.Execute("FileSaveAsPdf", ps.HSet)
            n, foot, sizes = pdf_pages(pdf); r["pdf"] = {"pages": n, "sizes": sorted(set(sizes)), "footers": [x[0] if x else "" for x in foot]}
        h.Clear(1)
    finally:
        h.Quit()
    return r


if __name__ == "__main__":
    p = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else None
    res = check_xlsx(p, out) if p.lower().endswith(".xlsx") else check_hwpx(p, out)
    print(json.dumps(res, ensure_ascii=False, indent=1, default=str))
