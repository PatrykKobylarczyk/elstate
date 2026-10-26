# Tymczasowa sonda: struktura plików GPKG z RCN (tabele, kolumny, przykładowe wartości)
import glob, sqlite3, sys
for t in sys.argv[1:]:
    for f in glob.glob(f"{t}/**/*.gpkg", recursive=True):
        print("#####", f)
        c = sqlite3.connect(f)
        print(c.execute("select table_name, data_type, srs_id from gpkg_contents").fetchall())
        print(c.execute("select table_name, column_name, geometry_type_name from gpkg_geometry_columns").fetchall())
        for (tb,) in c.execute("select table_name from gpkg_contents").fetchall():
            n = c.execute(f'select count(*) from "{tb}"').fetchone()[0]
            cols = [r[1] for r in c.execute(f'pragma table_info("{tb}")')]
            print(f"=== {tb} rows={n}")
            for col in cols:
                if col.lower() in ("geom", "geometry", "shape"):
                    continue
                d = c.execute(f'select count(distinct "{col}"), count("{col}") from "{tb}"').fetchone()
                top = c.execute(f'select "{col}", count(*) from "{tb}" group by 1 order by 2 desc limit 6').fetchall()
                top = [(str(v)[:60], k) for v, k in top]
                print(f"  {col}: distinct={d[0]} nonnull={d[1]} top={top}")
            if t == argv0 if (argv0 := sys.argv[1]) else False:
                pass
            r = c.execute(f'select * from "{tb}" limit 2').fetchall()
            for row in r:
                print("  ROW", {k: (v if not isinstance(v, bytes) else v[:48].hex()) for k, v in zip(cols, row)})
