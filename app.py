# -*- coding: utf-8 -*-
"""
Программа учёта сходов с линии пассажирского транспорта.

Локальное веб-приложение на Streamlit. Запуск:
    streamlit run app.py

Все данные хранятся в data/incidents.db (SQLite).
"""

import io
import os
from datetime import datetime, date

import pandas as pd
import streamlit as st
import plotly.express as px

import config
from modules import database as db
from modules import import_data
from modules import analytics
from modules import clean_data
from modules import excel_report
from modules import classify_breakdowns
from modules import auth
from modules import audit
from modules import backup

# ---------------------------------------------------------------------------
# Общие настройки страницы
# ---------------------------------------------------------------------------
st.set_page_config(page_title=config.APP_NAME, page_icon="🚌", layout="wide")

# Создаём базу данных и администратора при первом запуске
db.init_db()
auth.ensure_admin()

# Гейт входа: без авторизации приложение не открывается
auth.require_login()

PRIMARY = "#1F3864"

# Немного оформления
st.markdown(f"""
<style>
    .main .block-container {{padding-top: 1.5rem;}}
    h1, h2, h3 {{color: {PRIMARY};}}
    div[data-testid="stMetric"] {{
        background: white; border: 1px solid #E0E0E0; border-radius: 12px;
        padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }}
    section[data-testid="stSidebar"] {{background: #F2F5FA;}}
</style>
""", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Вспомогательные функции
# ---------------------------------------------------------------------------
@st.cache_data(show_spinner=False)
def load_incidents(_version):
    """Загрузить журнал из базы. _version — счётчик для сброса кэша."""
    return db.get_incidents_df()


def data_version():
    return st.session_state.get("data_version", 0)


def refresh_data():
    st.session_state["data_version"] = data_version() + 1


def get_df():
    return load_incidents(data_version())


CRIT_COLORS = {
    "Критическая": "🔴", "Высокая": "🟠", "Средняя": "🟡",
    "Низкая": "🟢", "Требует проверки": "⚪",
}


# ---------------------------------------------------------------------------
# Боковое меню
# ---------------------------------------------------------------------------
st.sidebar.title("🚌 Учёт сходов")
st.sidebar.caption("Пассажирский транспорт")
auth.top_bar()
st.sidebar.divider()

SECTIONS = [
    "🏠 Главная панель",
    "📥 Загрузка файла",
    "📋 Журнал сходов",
    "➕ Добавить сход",
    "🔧 База поломок",
    "👥 Справочники (люди и ТС)",
    "📅 Анализ по дням",
    "🚌 Анализ по маршрутам",
    "🚍 Проблемные автобусы",
    "👤 Анализ по водителям",
    "⚠️ Анализ поломок",
    "🔁 Повторяющиеся неисправности",
    "✅ Контроль данных",
    "📊 Excel-отчёт",
    "⚙️ Настройки",
    "🔐 Пользователи",
    "📝 Журнал действий",
    "💾 Резервные копии",
]
# Показываем только те разделы, которые доступны роли пользователя
visible_sections = auth.allowed_sections(SECTIONS)
choice = st.sidebar.radio("Разделы", visible_sections, label_visibility="collapsed")

total_now = db.count_incidents()
st.sidebar.divider()
st.sidebar.metric("Записей в журнале", total_now)


# ===========================================================================
# 1. ГЛАВНАЯ ПАНЕЛЬ
# ===========================================================================
def page_dashboard():
    st.title("🏠 Главная панель")
    df = get_df()
    if df.empty:
        st.info("Данных пока нет. Загрузите файл в разделе «📥 Загрузка файла» "
                "или добавьте сход вручную.")
        return

    # Фильтр по периоду
    dates = pd.to_datetime(df["incident_date"], errors="coerce")
    dmin, dmax = dates.min(), dates.max()
    c1, c2 = st.columns(2)
    start = c1.date_input("Период с", value=dmin.date() if pd.notna(dmin) else date.today())
    end = c2.date_input("Период по", value=dmax.date() if pd.notna(dmax) else date.today())
    mask = (dates.dt.date >= start) & (dates.dt.date <= end)
    fdf = df[mask]

    cards = analytics.summary_cards(fdf)

    st.subheader("Ключевые показатели")
    r1 = st.columns(4)
    r1[0].metric("Всего сходов", cards.get("total", 0))
    r1[1].metric("Технические", cards.get("technical", 0))
    r1[2].metric("По здоровью", cards.get("health", 0))
    r1[3].metric("ДТП и происшествия", cards.get("dtp", 0))
    r2 = st.columns(4)
    r2[0].metric("Проблемные автобусы", cards.get("problem_buses", 0))
    r2[1].metric("Среднее в день", cards.get("avg_per_day", 0))
    r2[2].metric("Самый проблемный маршрут", cards.get("top_route", "—"))
    r2[3].metric("Самый проблемный автобус", cards.get("top_vehicle", "—"))

    st.caption(f"Самая частая поломка: **{cards.get('top_breakdown', '—')}**")

    st.divider()
    # Графики
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Количество сходов по дням**")
        by_day = analytics.by_day(fdf)
        if not by_day.empty:
            fig = px.bar(by_day, x="Дата", y="Всего сходов",
                         color_discrete_sequence=[PRIMARY])
            fig.update_layout(height=340, margin=dict(l=10, r=10, t=10, b=10))
            st.plotly_chart(fig, width="stretch")
    with col2:
        st.markdown("**Структура причин сходов**")
        struct = analytics.category_structure(fdf)
        if not struct.empty:
            fig = px.pie(struct, names="Категория", values="Количество", hole=0.4)
            fig.update_layout(height=340, margin=dict(l=10, r=10, t=10, b=10))
            st.plotly_chart(fig, width="stretch")

    col3, col4 = st.columns(2)
    with col3:
        st.markdown("**ТОП-10 маршрутов по сходам**")
        rt = analytics.by_route(fdf).head(10)
        if not rt.empty:
            fig = px.bar(rt, x="Количество сходов", y="Маршрут", orientation="h",
                         color_discrete_sequence=["#C55A11"])
            fig.update_layout(height=360, yaxis={"categoryorder": "total ascending"},
                              margin=dict(l=10, r=10, t=10, b=10))
            st.plotly_chart(fig, width="stretch")
    with col4:
        st.markdown("**ТОП-10 автобусов по сходам**")
        vh = analytics.by_vehicle(fdf).head(10)
        if not vh.empty:
            fig = px.bar(vh, x="Всего сходов", y="Госномер", orientation="h",
                         color_discrete_sequence=["#C00000"])
            fig.update_layout(height=360, yaxis={"categoryorder": "total ascending"},
                              margin=dict(l=10, r=10, t=10, b=10))
            st.plotly_chart(fig, width="stretch")

    st.markdown("**ТОП-10 основных поломок**")
    bd = analytics.by_breakdown(fdf).head(10)
    if not bd.empty:
        fig = px.bar(bd, x="Количество сходов", y="Поломка", orientation="h",
                     color="Категория")
        fig.update_layout(height=400, yaxis={"categoryorder": "total ascending"},
                          margin=dict(l=10, r=10, t=10, b=10))
        st.plotly_chart(fig, width="stretch")


# ===========================================================================
# 2. ЗАГРУЗКА ФАЙЛА
# ===========================================================================
def page_upload():
    st.title("📥 Загрузка файла")
    st.write("Загрузите файл со сходами в формате **.xlsx**, **.xls** или **.csv**. "
             "Программа сама найдёт заголовки, распознает колонки и классифицирует причины.")

    if not auth.has_perm("import"):
        st.error("У вашей роли нет прав на загрузку файлов.")
        return

    file = st.file_uploader("Выберите файл", type=["xlsx", "xls", "csv"])
    if file is None:
        return

    # Ограничение размера файла
    size_mb = getattr(file, "size", 0) / (1024 * 1024)
    if size_mb > config.MAX_UPLOAD_SIZE_MB:
        st.error(f"Файл слишком большой ({size_mb:.1f} МБ). "
                 f"Максимум — {config.MAX_UPLOAD_SIZE_MB} МБ.")
        return

    with st.spinner("Читаю файл..."):
        raw = import_data.read_file(file, file.name)
        catalog = db.get_active_catalog()
        records, report = import_data.process_dataframe(raw, source_file=file.name,
                                                        catalog=catalog)

    st.success(f"Файл прочитан. Найдено строк с данными: **{report['rows_loaded']}** "
               f"(пустых пропущено: {report['rows_empty']}).")

    with st.expander("🔎 Протокол загрузки (какие колонки распознаны)", expanded=True):
        rec = report["recognized_columns"]
        st.write("**Распознанные колонки:**")
        st.table(pd.DataFrame(
            [{"Колонка в файле": k, "Поле программы": v} for k, v in rec.items()]))
        if report["unrecognized_columns"]:
            st.warning("Не распознаны (будут пропущены): "
                       + ", ".join(report["unrecognized_columns"]))

    prev = pd.DataFrame(records)
    if not prev.empty:
        show_cols = ["incident_date", "route_number", "vehicle_number", "driver_name",
                     "original_reason", "breakdown_name", "criticality"]
        show_cols = [c for c in show_cols if c in prev.columns]
        st.markdown("**Предпросмотр первых 15 записей:**")
        st.dataframe(prev[show_cols].head(15), width="stretch")

        unclass = int((prev["breakdown_code"] == "BRK-019").sum())
        if unclass:
            st.warning(f"Не классифицировано причин: **{unclass}**. "
                       "После загрузки проверьте их в «✅ Контроль данных».")

    # Проверка дублей относительно уже загруженного
    existing = get_df()
    dup_idx = clean_data.duplicates_in_records(existing, records)
    dup_action = "Пропустить дубликаты"
    if dup_idx:
        st.warning(f"Обнаружено совпадений с уже загруженными данными: **{len(dup_idx)}**.")
        dup_action = st.radio("Что сделать с дубликатами?",
                              ["Пропустить дубликаты", "Загрузить всё как есть"],
                              horizontal=True)

    if st.button("💾 Загрузить в журнал", type="primary"):
        to_load = records
        if dup_idx and dup_action == "Пропустить дубликаты":
            skip = set(dup_idx)
            to_load = [r for i, r in enumerate(records) if i not in skip]
        n = db.insert_incidents_bulk(to_load)
        db.add_import_history(file.name, report["rows_total"], n,
                              report["rows_total"] - report["rows_loaded"],
                              user_name=auth.current_user()["username"])
        audit.log_action("Загрузка файла", user=auth.current_user(),
                         object_type="file", object_id=file.name,
                         details=f"записей: {n}")
        refresh_data()
        st.success(f"Загружено записей: **{n}**. Данные сохранены в базу.")
        st.balloons()


# ===========================================================================
# 3. ЖУРНАЛ СХОДОВ
# ===========================================================================
def page_journal():
    st.title("📋 Журнал сходов")
    df = get_df()
    if df.empty:
        st.info("Журнал пуст.")
        return

    with st.expander("🔍 Фильтры", expanded=True):
        c = st.columns(4)
        search = c[0].text_input("Поиск (по всем полям)")
        routes = ["Все"] + sorted(df["route_number"].dropna().unique().tolist())
        route = c[1].selectbox("Маршрут", routes)
        vehicles = ["Все"] + sorted(df["vehicle_number"].dropna().unique().tolist())
        vehicle = c[2].selectbox("Госномер", vehicles)
        crits = ["Все"] + sorted(df["criticality"].dropna().unique().tolist())
        crit = c[3].selectbox("Критичность", crits)
        c2 = st.columns(4)
        cats = ["Все"] + sorted(df["breakdown_category"].dropna().unique().tolist())
        cat = c2[0].selectbox("Категория поломки", cats)
        drivers = ["Все"] + sorted(df["driver_name"].dropna().unique().tolist())
        driver = c2[1].selectbox("Водитель", drivers)
        disps = ["Все"] + sorted(df["dispatcher_name"].dropna().unique().tolist())
        disp = c2[2].selectbox("Диспетчер", disps)

    fdf = df.copy()
    if route != "Все":
        fdf = fdf[fdf["route_number"] == route]
    if vehicle != "Все":
        fdf = fdf[fdf["vehicle_number"] == vehicle]
    if crit != "Все":
        fdf = fdf[fdf["criticality"] == crit]
    if cat != "Все":
        fdf = fdf[fdf["breakdown_category"] == cat]
    if driver != "Все":
        fdf = fdf[fdf["driver_name"] == driver]
    if disp != "Все":
        fdf = fdf[fdf["dispatcher_name"] == disp]
    if search:
        s = search.lower()
        mask = fdf.astype(str).apply(lambda r: s in " ".join(r).lower(), axis=1)
        fdf = fdf[mask]

    st.caption(f"Показано записей: **{len(fdf)}** из {len(df)}")

    view = excel_report._journal_view(fdf)
    view.insert(0, "ID", fdf["id"].values)
    st.dataframe(view, width="stretch", height=430)

    # Экспорт отфильтрованного
    csv = view.to_csv(index=False).encode("utf-8-sig")
    st.download_button("⬇️ Скачать отфильтрованное (CSV)", csv,
                       file_name="журнал_фильтр.csv", mime="text/csv")

    if not auth.has_perm("edit_incidents"):
        st.info("Просмотр журнала. Для редактирования нужны права диспетчера "
                "или администратора.")
        return

    st.divider()
    st.subheader("✏️ Редактирование / удаление записи")
    ids = fdf["id"].tolist()
    if not ids:
        return
    sel = st.selectbox("Выберите ID записи", ids)
    row = df[df["id"] == sel].iloc[0]

    with st.form("edit_form"):
        cc = st.columns(3)
        route_v = cc[0].text_input("Маршрут", row["route_number"] or "")
        veh_v = cc[1].text_input("Госномер", row["vehicle_number"] or "")
        drv_v = cc[2].text_input("Водитель", row["driver_name"] or "")
        reason_v = st.text_input("Причина схода", row["original_reason"] or "")
        cats_all = db.get_catalog_df()
        cat_names = cats_all["breakdown_name"].tolist()
        cur_name = row["breakdown_name"] if row["breakdown_name"] in cat_names else (cat_names[0] if cat_names else "")
        name_v = st.selectbox("Поломка (из справочника)", cat_names,
                              index=cat_names.index(cur_name) if cur_name in cat_names else 0)
        note_v = st.text_input("Примечание", row["note"] or "")
        status_v = st.selectbox("Статус", ["закрыт", "открыт", "требует проверки"],
                                index=["закрыт", "открыт", "требует проверки"].index(
                                    row["status"] if row["status"] in ("закрыт", "открыт", "требует проверки") else "закрыт"))
        colb = st.columns(2)
        save = colb[0].form_submit_button("💾 Сохранить изменения", type="primary")
        delete = colb[1].form_submit_button("🗑️ Удалить запись")

    if save:
        cat_row = cats_all[cats_all["breakdown_name"] == name_v].iloc[0]
        db.update_incident(int(sel), {
            "route_number": route_v, "vehicle_number": veh_v, "driver_name": drv_v,
            "original_reason": reason_v, "breakdown_name": name_v,
            "breakdown_code": cat_row["breakdown_code"],
            "breakdown_category": cat_row["category"],
            "criticality": cat_row["criticality"],
            "note": note_v, "status": status_v,
        })
        audit.log_action("Редактирование схода", user=auth.current_user(),
                         object_type="incident", object_id=sel)
        refresh_data()
        st.success("Запись обновлена.")
        st.rerun()
    if delete:
        if not auth.has_perm("delete_incidents"):
            st.error("У вашей роли нет прав на удаление записей.")
        else:
            db.delete_incident(int(sel))
            audit.log_action("Удаление схода", user=auth.current_user(),
                             object_type="incident", object_id=sel)
            refresh_data()
            st.success("Запись удалена.")
            st.rerun()


# ===========================================================================
# 4. ДОБАВИТЬ СХОД
# ===========================================================================
def page_add():
    st.title("➕ Добавить сход")
    if not auth.has_perm("edit_incidents"):
        st.error("У вашей роли нет прав на добавление сходов.")
        return
    catalog = db.get_catalog_df()

    reason_live = st.text_input("Причина схода (введите текст)",
                                key="reason_live",
                                help="Программа предложит похожие поломки из базы")
    suggestions = classify_breakdowns.suggest_breakdowns(
        reason_live, catalog=db.get_active_catalog())
    if reason_live and suggestions:
        st.info("Похожие поломки: " + " · ".join(
            f"{s['breakdown_name']} ({s['category']})" for s in suggestions))

    with st.form("add_form"):
        c = st.columns(3)
        d = c[0].date_input("Дата", value=date.today())
        column_v = c[1].text_input("Колонна")
        route_v = c[2].text_input("Маршрут")
        c2 = st.columns(3)
        run_v = c2[0].text_input("Выход")
        veh_v = c2[1].text_input("Госномер автобуса")
        tab_v = c2[2].text_input("Табельный номер водителя")
        driver_v = st.text_input("Ф.И.О. водителя")
        c3 = st.columns(4)
        t_dep = c3[0].text_input("Время выезда (ЧЧ:ММ)")
        t_msg = c3[1].text_input("Время сообщения (ЧЧ:ММ)")
        t_ret = c3[2].text_input("Заезд в парк (ЧЧ:ММ)")
        t_out = c3[3].text_input("Повторный выход (ЧЧ:ММ)")

        # По умолчанию поломку подставим из подсказки
        names = catalog["breakdown_name"].tolist()
        default_name = suggestions[0]["breakdown_name"] if suggestions else names[0]
        name_v = st.selectbox("Поломка (из справочника)", names,
                              index=names.index(default_name) if default_name in names else 0)
        note_v = st.text_input("Примечание")
        health_v = st.text_input("Причина по состоянию здоровья (если есть)")
        disp_v = st.text_input("Диспетчер")
        status_v = st.selectbox("Статус", ["закрыт", "открыт", "требует проверки"])
        submit = st.form_submit_button("💾 Сохранить сход", type="primary")

    if submit:
        cat_row = catalog[catalog["breakdown_name"] == name_v].iloc[0]
        weekday = import_data.WEEKDAYS_RU[d.weekday()]
        db.insert_incident({
            "incident_date": d.strftime("%Y-%m-%d"), "weekday": weekday,
            "column_number": column_v, "route_number": route_v, "run_number": run_v,
            "vehicle_number": veh_v, "driver_tab_number": tab_v, "driver_name": driver_v,
            "departure_time": t_dep, "incident_report_time": t_msg,
            "return_to_depot_time": t_ret, "restart_time": t_out,
            "original_reason": reason_live, "breakdown_code": cat_row["breakdown_code"],
            "breakdown_category": cat_row["category"], "breakdown_name": name_v,
            "criticality": cat_row["criticality"], "note": note_v,
            "health_reason": health_v, "dispatcher_name": disp_v,
            "status": status_v, "source_file": "ручной ввод",
        })
        audit.log_action("Добавлен сход", user=auth.current_user(),
                         object_type="incident",
                         details=f"{route_v} / {veh_v} / {name_v}")
        refresh_data()
        st.success("Сход добавлен в журнал.")


# ===========================================================================
# 5. БАЗА ПОЛОМОК
# ===========================================================================
def page_catalog():
    st.title("🔧 База основных поломок")
    st.write("Справочник поломок используется для стандартизации причин и "
             "автоматической классификации.")
    cat = db.get_catalog_df()
    show = cat.rename(columns={
        "breakdown_code": "Код", "category": "Категория", "breakdown_name": "Наименование",
        "keywords": "Ключевые слова", "criticality": "Критичность",
        "responsible_department": "Служба", "status": "Статус"})
    st.dataframe(show[["Код", "Категория", "Наименование", "Ключевые слова",
                       "Критичность", "Служба", "Статус"]],
                 width="stretch", height=430)

    if not auth.has_perm("manage_catalog"):
        st.info("Просмотр справочника. Редактирование доступно администратору.")
        return

    st.divider()
    tab_add, tab_edit = st.tabs(["➕ Добавить поломку", "✏️ Изменить / отключить"])

    with tab_add:
        with st.form("cat_add"):
            c = st.columns(2)
            code = c[0].text_input("Код поломки", value=f"BRK-{len(cat)+1:03d}")
            category = c[1].text_input("Категория")
            name = st.text_input("Наименование поломки")
            keywords = st.text_input("Ключевые слова (через запятую)")
            c2 = st.columns(2)
            crit = c2[0].selectbox("Критичность",
                                   ["Низкая", "Средняя", "Высокая", "Критическая", "Требует проверки"])
            dept = c2[1].text_input("Ответственная служба")
            add = st.form_submit_button("Добавить", type="primary")
        if add:
            db.insert_catalog_item({
                "breakdown_code": code, "category": category, "breakdown_name": name,
                "keywords": keywords, "criticality": crit,
                "responsible_department": dept, "status": "активная"})
            audit.log_action("Добавлена поломка в справочник", user=auth.current_user(),
                             object_type="breakdown", object_id=code)
            st.success("Поломка добавлена в справочник.")
            st.rerun()

    with tab_edit:
        codes = cat["breakdown_code"].tolist()
        sel = st.selectbox("Выберите код", codes)
        row = cat[cat["breakdown_code"] == sel].iloc[0]
        with st.form("cat_edit"):
            name = st.text_input("Наименование", row["breakdown_name"] or "")
            keywords = st.text_input("Ключевые слова", row["keywords"] or "")
            c = st.columns(2)
            crit = c[0].selectbox("Критичность",
                                  ["Низкая", "Средняя", "Высокая", "Критическая", "Требует проверки"],
                                  index=max(0, ["Низкая", "Средняя", "Высокая", "Критическая", "Требует проверки"].index(row["criticality"]) if row["criticality"] in ["Низкая", "Средняя", "Высокая", "Критическая", "Требует проверки"] else 0))
            status = c[1].selectbox("Статус", ["активная", "архивная"],
                                    index=0 if row["status"] == "активная" else 1)
            save = st.form_submit_button("💾 Сохранить", type="primary")
        if save:
            db.update_catalog_item(int(row["id"]), {
                "breakdown_name": name, "keywords": keywords,
                "criticality": crit, "status": status})
            audit.log_action("Изменена поломка в справочнике", user=auth.current_user(),
                             object_type="breakdown", object_id=sel)
            st.success("Изменения сохранены.")
            st.rerun()

        st.markdown("---")
        st.caption("Удаление поломки из справочника (действие необратимо).")
        del_confirm = st.checkbox(f"Подтверждаю удаление «{sel}»", key="cat_del_chk")
        if st.button("🗑️ Удалить поломку", disabled=not del_confirm, key="cat_del_btn"):
            db.delete_catalog_item(int(row["id"]))
            audit.log_action("Удалена поломка из справочника", user=auth.current_user(),
                             object_type="breakdown", object_id=sel)
            st.success("Поломка удалена из справочника.")
            st.rerun()


# ===========================================================================
# 5b. СПРАВОЧНИКИ: ВОДИТЕЛИ И ДИСПЕТЧЕРЫ
# ===========================================================================
# Настройки трёх справочников людей и ТС
def _ref_config(kind):
    if kind == "driver":
        return {
            "title": "водителей", "unit": "чел.",
            "get": db.get_drivers_df, "replace": db.replace_drivers,
            "upsert": db.upsert_drivers_bulk, "clear": db.clear_drivers,
            "reader": import_data.read_reference_file,
            "display_cols": ["Табельный номер", "Ф.И.О."],
            "db_map": {"driver_tab_number": "Табельный номер", "driver_name": "Ф.И.О."},
            "rec_from_reader": lambda r: {"tab_number": r.get("tab_number"), "name": r.get("name")},
            "rec_from_row": lambda r: {"tab_number": r.get("Табельный номер"), "name": r.get("Ф.И.О.")},
            "hint": "Файл с колонками **Ф.И.О.** и **Табельный номер**.",
        }
    if kind == "dispatcher":
        return {
            "title": "диспетчеров", "unit": "чел.",
            "get": db.get_dispatchers_df, "replace": db.replace_dispatchers,
            "upsert": db.upsert_dispatchers_bulk, "clear": db.clear_dispatchers,
            "reader": import_data.read_reference_file,
            "display_cols": ["Табельный номер", "Ф.И.О."],
            "db_map": {"dispatcher_tab_number": "Табельный номер", "dispatcher_name": "Ф.И.О."},
            "rec_from_reader": lambda r: {"tab_number": r.get("tab_number"), "name": r.get("name")},
            "rec_from_row": lambda r: {"tab_number": r.get("Табельный номер"), "name": r.get("Ф.И.О.")},
            "hint": "Файл с колонками **Ф.И.О.** и **Табельный номер**.",
        }
    # vehicle
    return {
        "title": "транспортных средств", "unit": "ед.",
        "get": db.get_vehicles_df, "replace": db.replace_vehicles,
        "upsert": db.upsert_vehicles_bulk, "clear": db.clear_vehicles,
        "reader": import_data.read_vehicles_file,
        "display_cols": ["Госномер", "Марка", "Класс автобуса"],
        "db_map": {"vehicle_number": "Госномер", "model": "Марка", "bus_class": "Класс автобуса"},
        "rec_from_reader": lambda r: {"vehicle_number": r.get("vehicle_number"),
                                      "model": r.get("model"), "bus_class": r.get("bus_class")},
        "rec_from_row": lambda r: {"vehicle_number": r.get("Госномер"),
                                   "model": r.get("Марка"), "bus_class": r.get("Класс автобуса")},
        "hint": "Файл с колонками **Марка**, **Госномер** и **Класс автобуса**.",
    }


def page_references():
    st.title("👥 Справочники")
    st.write("Справочники водителей, диспетчеров и транспортных средств. "
             "Можно **загрузить из файла** (Excel/CSV) или **редактировать вручную** "
             "прямо в таблице — добавлять, изменять и удалять строки.")

    tab_drv, tab_disp, tab_veh = st.tabs(
        ["🚍 Водители", "🎧 Диспетчеры", "🚌 Транспортные средства"])
    with tab_drv:
        _reference_block("driver")
    with tab_disp:
        _reference_block("dispatcher")
    with tab_veh:
        _reference_block("vehicle")


def _reference_block(kind):
    """Универсальный блок справочника: загрузка из файла + ручное редактирование."""
    cfg = _ref_config(kind)
    title = cfg["title"]
    display_cols = cfg["display_cols"]

    # Просмотр без прав редактирования
    if not auth.has_perm("manage_refs"):
        data = cfg["get"]()
        st.caption(f"Справочник {title}: {len(data)} {cfg['unit']} (только просмотр).")
        if not data.empty:
            st.dataframe(data.rename(columns=cfg["db_map"])[display_cols], width="stretch")
        return

    # --- 1. Загрузка из файла ---
    with st.expander(f"📥 Загрузить справочник {title} из файла", expanded=False):
        st.caption(cfg["hint"] + " Программа сама распознает колонки, даже если "
                   "они названы немного по-другому или заголовков нет вовсе.")
        file = st.file_uploader(f"Файл со списком: {title}", type=["xlsx", "xls", "csv"],
                                key=f"upl_{kind}")
        if file is not None:
            records, rep = cfg["reader"](file, file.name)
            records = [cfg["rec_from_reader"](r) for r in records]
            if not records:
                st.error("Не удалось распознать данные. Проверьте колонки в файле.")
            else:
                st.success(f"Распознано записей: **{len(records)}**.")
                prev = pd.DataFrame(records)
                st.dataframe(prev.head(20), width="stretch")
                cmode = st.radio("Как загрузить?",
                                 ["Дополнить справочник", "Заменить справочник целиком"],
                                 horizontal=True, key=f"mode_{kind}")
                if st.button(f"💾 Загрузить в справочник {title}", type="primary",
                             key=f"save_{kind}"):
                    if cmode.startswith("Заменить"):
                        ins, upd = cfg["replace"](records)
                    else:
                        ins, upd = cfg["upsert"](records)
                    audit.log_action(f"Загрузка справочника: {title}",
                                     user=auth.current_user(), object_type="reference",
                                     details=f"добавлено {ins}, обновлено {upd}")
                    st.success(f"Готово! Добавлено: **{ins}**, обновлено: **{upd}**.")
                    st.rerun()

    # --- 2. Ручное редактирование в таблице ---
    data = cfg["get"]()
    st.subheader(f"✏️ Редактирование ({len(data)} {cfg['unit']})")
    st.caption("Измените ячейки, добавьте строки внизу таблицы (кнопка «+») "
               "или удалите (выделите строку → клавиша Delete), затем нажмите «Сохранить».")

    if data.empty:
        grid = pd.DataFrame(columns=display_cols)
    else:
        grid = data.rename(columns=cfg["db_map"])[display_cols]

    edited = st.data_editor(
        grid, num_rows="dynamic", width="stretch", height=360,
        key=f"editor_{kind}",
        column_config={c: st.column_config.TextColumn(c) for c in display_cols},
    )

    c1, c2 = st.columns([1, 3])
    if c1.button("💾 Сохранить изменения", type="primary", key=f"savedit_{kind}"):
        recs = []
        for _, row in edited.iterrows():
            rec = cfg["rec_from_row"](row.to_dict())
            if any(str(v).strip() for v in rec.values() if v is not None):
                recs.append(rec)
        ins, upd = cfg["replace"](recs)
        audit.log_action(f"Изменён справочник: {title}", user=auth.current_user(),
                         object_type="reference", details=f"записей {ins + upd}")
        st.success(f"Сохранено записей: **{ins + upd}**.")
        st.rerun()

    # Скачивание
    if not data.empty:
        csv = grid.to_csv(index=False).encode("utf-8-sig")
        c2.download_button("⬇️ Скачать справочник (CSV)", csv,
                           file_name=f"справочник_{title}.csv", mime="text/csv",
                           key=f"dl_{kind}")

    # --- 3. Полная очистка ---
    with st.expander("🗑️ Очистить весь справочник"):
        confirm = st.checkbox(f"Подтверждаю полную очистку справочника {title}",
                              key=f"clr_chk_{kind}")
        if st.button(f"Очистить справочник {title}", disabled=not confirm,
                     key=f"clr_btn_{kind}"):
            cfg["clear"]()
            st.success("Справочник очищен.")
            st.rerun()


# ===========================================================================
# 6-10. АНАЛИТИЧЕСКИЕ РАЗДЕЛЫ
# ===========================================================================
def page_by_day():
    st.title("📅 Анализ по дням")
    df = get_df()
    if df.empty:
        st.info("Нет данных.")
        return
    data = analytics.by_day(df)
    c = st.columns(3)
    c[0].metric("День с макс. сходами",
                f"{data.loc[data['Всего сходов'].idxmax(), 'Дата']} "
                f"({data['Всего сходов'].max()})")
    c[1].metric("День с мин. сходами",
                f"{data.loc[data['Всего сходов'].idxmin(), 'Дата']} "
                f"({data['Всего сходов'].min()})")
    c[2].metric("Среднее в день", round(data["Всего сходов"].mean(), 1))

    fig = px.bar(data, x="Дата", y=["Технические", "Здоровье", "ДТП",
                                    "Организационные", "Прочие"],
                 title="Сходы по дням (по группам)")
    fig.update_layout(height=380)
    st.plotly_chart(fig, width="stretch")
    st.dataframe(data, width="stretch", height=400)


def page_by_route():
    st.title("🚌 Анализ по маршрутам")
    df = get_df()
    if df.empty:
        st.info("Нет данных.")
        return
    data = analytics.by_route(df)
    fig = px.bar(data.head(10), x="Количество сходов", y="Маршрут", orientation="h",
                 title="ТОП-10 маршрутов", color_discrete_sequence=["#C55A11"])
    fig.update_layout(height=380, yaxis={"categoryorder": "total ascending"})
    st.plotly_chart(fig, width="stretch")
    st.dataframe(data, width="stretch", height=420)


def page_by_vehicle():
    st.title("🚍 Проблемные автобусы")
    df = get_df()
    if df.empty:
        st.info("Нет данных.")
        return
    data = analytics.by_vehicle(df)
    st.caption("Статус: 🟢 0–1 сход · 🟡 2 · 🟠 3–4 · 🔴 5 и более / критические")
    fig = px.bar(data.head(10), x="Всего сходов", y="Госномер", orientation="h",
                 title="ТОП-10 проблемных автобусов", color_discrete_sequence=["#C00000"])
    fig.update_layout(height=380, yaxis={"categoryorder": "total ascending"})
    st.plotly_chart(fig, width="stretch")
    st.dataframe(data, width="stretch", height=420)


def page_by_driver():
    st.title("👤 Анализ по водителям")
    df = get_df()
    if df.empty:
        st.info("Нет данных.")
        return
    data = analytics.by_driver(df)
    problem = data[(data["Количество сходов"] >= 2) | (data["По здоровью"] >= 2)
                   | (data["ДТП"] >= 1)]
    st.metric("Водителей с 2+ сходами / ДТП / по здоровью", len(problem))
    fig = px.bar(data.head(10), x="Количество сходов", y="Водитель", orientation="h",
                 title="ТОП-10 водителей по сходам")
    fig.update_layout(height=380, yaxis={"categoryorder": "total ascending"})
    st.plotly_chart(fig, width="stretch")
    st.dataframe(data, width="stretch", height=420)


def page_by_breakdown():
    st.title("⚠️ Анализ по поломкам")
    df = get_df()
    if df.empty:
        st.info("Нет данных.")
        return
    data = analytics.by_breakdown(df)
    c1, c2 = st.columns(2)
    with c1:
        fig = px.bar(data.head(10), x="Количество сходов", y="Поломка", orientation="h",
                     title="ТОП-10 поломок", color="Категория")
        fig.update_layout(height=420, yaxis={"categoryorder": "total ascending"})
        st.plotly_chart(fig, width="stretch")
    with c2:
        struct = analytics.category_structure(df)
        fig = px.pie(struct, names="Категория", values="Количество",
                     title="Структура по группам", hole=0.4)
        fig.update_layout(height=420)
        st.plotly_chart(fig, width="stretch")
    st.dataframe(data, width="stretch", height=400)


def page_recurring():
    st.title("🔁 Повторяющиеся неисправности")
    df = get_df()
    if df.empty:
        st.info("Нет данных.")
        return
    data = analytics.recurring_faults(df)
    if data.empty:
        st.success("Повторяющихся неисправностей не выявлено.")
        return
    st.caption("Один автобус с одинаковой поломкой 2 и более раз за период.")
    st.dataframe(data, width="stretch", height=460)


# ===========================================================================
# 11. КОНТРОЛЬ ДАННЫХ
# ===========================================================================
def page_quality():
    st.title("✅ Контроль качества данных")
    df = get_df()
    if df.empty:
        st.info("Нет данных.")
        return
    problems = clean_data.check_quality(df)
    dups = clean_data.find_duplicates(df)

    c = st.columns(2)
    c[0].metric("Найдено замечаний", len(problems))
    c[1].metric("Возможных дубликатов", len(dups))

    st.subheader("Замечания по данным")
    if problems.empty:
        st.success("Ошибок не найдено.")
    else:
        st.dataframe(problems, width="stretch", height=380)
        csv = problems.to_csv(index=False).encode("utf-8-sig")
        st.download_button("⬇️ Скачать список замечаний (CSV)", csv,
                           file_name="замечания.csv", mime="text/csv")

    st.subheader("Возможные дубликаты")
    if dups.empty:
        st.success("Дубликатов не найдено.")
    else:
        st.dataframe(excel_report._journal_view(dups), width="stretch", height=300)


# ===========================================================================
# 12. EXCEL-ОТЧЁТ
# ===========================================================================
def page_report():
    st.title("📊 Формирование Excel-отчёта")
    df = get_df()
    if df.empty:
        st.info("Нет данных для отчёта.")
        return
    dates = pd.to_datetime(df["incident_date"], errors="coerce")
    period = ""
    if dates.notna().any():
        period = f"{dates.min().strftime('%d.%m.%Y')} — {dates.max().strftime('%d.%m.%Y')}"

    c = st.columns(2)
    org = c[0].text_input("Организация", "Автотранспортное предприятие")
    executor = c[1].text_input("Исполнитель (ФИО)", "")
    st.caption(f"Период отчёта: {period or '—'} · Записей: {len(df)}")

    if st.button("📥 Сформировать Excel-отчёт", type="primary"):
        with st.spinner("Формирую отчёт..."):
            data = excel_report.build_report(df, period=period, organization=org,
                                             executor=executor)
        audit.log_action("Сформирован Excel-отчёт", user=auth.current_user(),
                         details=f"период: {period or '—'}")
        st.success("Отчёт готов!")
        st.download_button("⬇️ Скачать «Отчёт_по_сходам_с_линии.xlsx»", data,
                           file_name="Отчёт_по_сходам_с_линии.xlsx",
                           mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


# ===========================================================================
# 13. НАСТРОЙКИ
# ===========================================================================
def page_settings():
    st.title("⚙️ Настройки и справочники")
    st.subheader("История загрузок")
    hist = db.get_import_history_df()
    if hist.empty:
        st.caption("Загрузок ещё не было.")
    else:
        st.dataframe(hist.rename(columns={
            "file_name": "Файл", "import_date": "Дата", "rows_total": "Строк всего",
            "rows_loaded": "Загружено", "rows_errors": "Ошибок"})[
            ["Файл", "Дата", "Строк всего", "Загружено", "Ошибок"]],
            width="stretch")

    st.divider()
    st.subheader("Параметры системы")
    cc = st.columns(3)
    cc[0].metric("Автовыход по простою", f"{config.SESSION_TIMEOUT_MINUTES} мин")
    cc[1].metric("Макс. размер файла", f"{config.MAX_UPLOAD_SIZE_MB} МБ")
    cc[2].metric("Режим", config.APP_ENV)
    st.caption("Параметры задаются в файле .env на сервере.")

    st.divider()
    st.subheader("⚠️ Опасная зона")
    st.write("Полная очистка журнала сходов (справочник поломок останется).")
    confirm = st.checkbox("Я понимаю, что все записи журнала будут удалены")
    if st.button("🗑️ Очистить журнал сходов", disabled=not confirm):
        db.delete_all_incidents()
        audit.log_action("Очистка журнала сходов", user=auth.current_user())
        refresh_data()
        st.success("Журнал очищен.")
        st.rerun()


# ===========================================================================
# 14. ПОЛЬЗОВАТЕЛИ (только администратор)
# ===========================================================================
def page_users():
    st.title("🔐 Пользователи и роли")
    st.caption("Управление доступом. Роли: администратор, диспетчер, "
               "техническая служба, руководитель, просмотр.")
    users = auth.list_users_df()
    show = users.rename(columns={
        "username": "Логин", "full_name": "Ф.И.О.", "role": "Роль",
        "is_active": "Активен", "last_login": "Последний вход"})
    show["Роль"] = show["Роль"].map(auth.ROLES).fillna(show["Роль"])
    show["Активен"] = show["Активен"].map({1: "да", 0: "нет"})
    st.dataframe(show[["id", "Логин", "Ф.И.О.", "Роль", "Активен", "Последний вход"]],
                 width="stretch", height=280)

    tab_add, tab_edit = st.tabs(["➕ Добавить пользователя", "✏️ Изменить / пароль"])

    role_options = list(auth.ROLES.keys())
    role_label = lambda r: auth.ROLES[r]

    with tab_add:
        with st.form("user_add"):
            c = st.columns(2)
            username = c[0].text_input("Логин")
            full_name = c[1].text_input("Ф.И.О.")
            c2 = st.columns(2)
            role = c2[0].selectbox("Роль", role_options, format_func=role_label)
            password = c2[1].text_input("Пароль", type="password")
            add = st.form_submit_button("Создать", type="primary")
        if add:
            if not username or not password:
                st.warning("Укажите логин и пароль.")
            elif auth.get_user(username.strip()):
                st.error("Пользователь с таким логином уже существует.")
            else:
                auth.create_user(username, password, full_name, role)
                audit.log_action("Создан пользователь", user=auth.current_user(),
                                 object_type="user", object_id=username)
                st.success(f"Пользователь «{username}» создан.")
                st.rerun()

    with tab_edit:
        if users.empty:
            st.caption("Пользователей нет.")
        else:
            unames = users["username"].tolist()
            sel = st.selectbox("Выберите пользователя", unames)
            row = users[users["username"] == sel].iloc[0]
            cur = auth.current_user()
            c = st.columns(2)
            new_role = c[0].selectbox("Роль", role_options, format_func=role_label,
                                      index=role_options.index(row["role"])
                                      if row["role"] in role_options else 0)
            active = c[1].checkbox("Активен", value=bool(row["is_active"]))
            if st.button("💾 Сохранить роль/статус", type="primary"):
                # Защита: нельзя отключить или разжаловать самого себя
                if int(row["id"]) == cur["id"] and (not active or new_role != "admin"):
                    st.error("Нельзя отключить или понизить свою собственную учётную запись.")
                else:
                    auth.update_user_role(int(row["id"]), new_role)
                    auth.set_user_active(int(row["id"]), active)
                    audit.log_action("Изменён пользователь", user=cur,
                                     object_type="user", object_id=sel,
                                     details=f"роль={new_role}, активен={active}")
                    st.success("Изменения сохранены.")
                    st.rerun()

            st.markdown("---")
            new_pw = st.text_input("Новый пароль", type="password", key="reset_pw")
            if st.button("🔑 Сбросить пароль"):
                if not new_pw:
                    st.warning("Введите новый пароль.")
                else:
                    auth.set_password(int(row["id"]), new_pw)
                    audit.log_action("Сброшен пароль", user=cur,
                                     object_type="user", object_id=sel)
                    st.success("Пароль обновлён.")


# ===========================================================================
# 15. ЖУРНАЛ ДЕЙСТВИЙ (аудит, только администратор)
# ===========================================================================
def page_audit():
    st.title("📝 Журнал действий")
    st.caption("Все ключевые действия пользователей: вход/выход, загрузка, "
               "добавление и изменение записей, отчёты, резервные копии.")
    data = audit.get_audit_df()
    if data.empty:
        st.info("Записей пока нет.")
        return
    view = data.rename(columns={
        "created_at": "Дата и время", "username": "Пользователь", "action": "Действие",
        "object_type": "Объект", "object_id": "ID объекта", "details": "Детали"})
    c = st.columns(2)
    users = ["Все"] + sorted(view["Пользователь"].dropna().unique().tolist())
    fu = c[0].selectbox("Пользователь", users)
    actions = ["Все"] + sorted(view["Действие"].dropna().unique().tolist())
    fa = c[1].selectbox("Действие", actions)
    if fu != "Все":
        view = view[view["Пользователь"] == fu]
    if fa != "Все":
        view = view[view["Действие"] == fa]
    st.dataframe(view[["Дата и время", "Пользователь", "Действие", "Объект",
                       "ID объекта", "Детали"]], width="stretch", height=460)
    csv = view.to_csv(index=False).encode("utf-8-sig")
    st.download_button("⬇️ Скачать журнал (CSV)", csv,
                       file_name="журнал_действий.csv", mime="text/csv")


# ===========================================================================
# 16. РЕЗЕРВНЫЕ КОПИИ (только администратор)
# ===========================================================================
def page_backups():
    st.title("💾 Резервные копии")
    st.caption("Копия базы данных со всеми сходами, справочниками и настройками. "
               "Рекомендуется делать копию перед обновлением программы.")

    if st.button("➕ Создать резервную копию", type="primary"):
        path = backup.create_backup()
        audit.log_action("Создана резервная копия", user=auth.current_user(),
                         object_type="backup", object_id=os.path.basename(path))
        st.success(f"Копия создана: {os.path.basename(path)}")
        st.rerun()

    items = backup.list_backups()
    st.subheader(f"История копий: {len(items)}")
    if not items:
        st.caption("Копий пока нет.")
        return

    for it in items:
        c = st.columns([3, 2, 1.4, 1.4])
        c[0].write(f"📦 **{it['name']}**")
        c[1].write(f"{it['created']}")
        with open(it["path"], "rb") as f:
            c[2].download_button("⬇️ Скачать", f.read(), file_name=it["name"],
                                 key=f"dl_{it['name']}")
        if c[3].button("♻️ Восстановить", key=f"rs_{it['name']}"):
            st.session_state["restore_target"] = it["name"]

    target = st.session_state.get("restore_target")
    if target:
        st.warning(f"Восстановить базу из копии «{target}»? "
                   "Текущие данные будут заменены (страховочная копия создастся автоматически).")
        cc = st.columns(2)
        if cc[0].button("Да, восстановить", type="primary"):
            backup.restore_backup(target)
            audit.log_action("Восстановление из копии", user=auth.current_user(),
                             object_type="backup", object_id=target)
            st.session_state.pop("restore_target", None)
            refresh_data()
            st.success("База восстановлена из резервной копии.")
            st.rerun()
        if cc[1].button("Отмена"):
            st.session_state.pop("restore_target", None)
            st.rerun()


# ---------------------------------------------------------------------------
# Роутер
# ---------------------------------------------------------------------------
PAGES = {
    "🏠 Главная панель": page_dashboard,
    "📥 Загрузка файла": page_upload,
    "📋 Журнал сходов": page_journal,
    "➕ Добавить сход": page_add,
    "🔧 База поломок": page_catalog,
    "👥 Справочники (люди и ТС)": page_references,
    "📅 Анализ по дням": page_by_day,
    "🚌 Анализ по маршрутам": page_by_route,
    "🚍 Проблемные автобусы": page_by_vehicle,
    "👤 Анализ по водителям": page_by_driver,
    "⚠️ Анализ поломок": page_by_breakdown,
    "🔁 Повторяющиеся неисправности": page_recurring,
    "✅ Контроль данных": page_quality,
    "📊 Excel-отчёт": page_report,
    "⚙️ Настройки": page_settings,
    "🔐 Пользователи": page_users,
    "📝 Журнал действий": page_audit,
    "💾 Резервные копии": page_backups,
}

# Защита в глубину: проверяем доступ к разделу ещё раз перед показом
if not choice:
    st.info("Нет доступных разделов для вашей роли.")
elif not auth.can_open(choice):
    st.error("У вашей роли нет доступа к этому разделу.")
else:
    PAGES[choice]()
