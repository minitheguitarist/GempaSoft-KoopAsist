use tauri::{AppHandle, State, Manager};
use crate::db::AppState;

use crate::models::{
    Member, CreateMemberArgs, 
    Cooperative, CreateCoopArgs, 
    AddMemberToCoopArgs, CoopMember,
    Due, PayDueArgs, ReceiptInfo
};
use sqlx::Row;
use chrono::Datelike;


#[tauri::command]
pub async fn get_payment_receipt_info(state: State<'_, AppState>, coop_member_id: i64) -> Result<ReceiptInfo, String> {
    let info = sqlx::query_as::<_, ReceiptInfo>(
        "SELECT 
            c.name as coop_name,
            m.full_name as member_full_name,
            m.tc_number as member_tc,
            m.phone_1 as member_phone
         FROM cooperative_members cm
         JOIN cooperatives c ON cm.coop_id = c.id
         JOIN members m ON cm.member_id = m.id
         WHERE cm.id = ?"
    )
    .bind(coop_member_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Coop member info not found")?;

    Ok(info)
}


#[tauri::command]
pub async fn generate_yearly_dues(state: State<'_, AppState>, coop_member_id: i64, year: i32, total_amount: f64) -> Result<(), String> {
    let monthly_amount = total_amount / 12.0;

    for month in 1..=12 {
        let period = format!("{:04}-{:02}-01", year, month);

        // Check if due exists (standard check for "main" due of that month)
        // We only update the 'main' due, i.e. not the extras (extra dues usually have same period but we treat them separately? 
        // Actually, period alone isn't unique if we allow extras. 
        // But for generation, we assume we are targeting the "primary" slot.
        // Let's assume the first one found for that period is the "primary".
        
        let exists = sqlx::query(
            "SELECT id, status FROM dues WHERE coop_member_id = ? AND period = ? LIMIT 1"
        )
        .bind(coop_member_id)
        .bind(&period)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

        if let Some(due) = exists {
            let status: String = due.try_get("status").unwrap_or_default();
            // Only update if unpaid
            if status != "paid" {
                 sqlx::query(
                    "UPDATE dues SET amount = ? WHERE id = ?"
                )
                .bind(monthly_amount)
                .bind(due.try_get::<i64, _>("id").unwrap())
                .execute(&state.db)
                .await
                .map_err(|e| e.to_string())?;
            }
        } else {
             sqlx::query(
                "INSERT INTO dues (coop_member_id, period, amount, status) VALUES (?, ?, ?, 'unpaid')"
            )
            .bind(coop_member_id)
            .bind(&period)
            .bind(monthly_amount)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_due(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    sqlx::query("DELETE FROM dues WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_yearly_dues(state: State<'_, AppState>, coop_member_id: i64, year: i32) -> Result<(), String> {
    let start_date = format!("{:04}-01-01", year);
    let end_date = format!("{:04}-12-31", year);

    sqlx::query("DELETE FROM dues WHERE coop_member_id = ? AND period BETWEEN ? AND ?")
        .bind(coop_member_id)
        .bind(start_date)
        .bind(end_date)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_due_amount(state: State<'_, AppState>, id: i64, amount: f64) -> Result<(), String> {
    // Only allow update if not fully paid? Or allow anyway but might look weird if paid > amount.
    // For now, simple update.
    sqlx::query("UPDATE dues SET amount = ? WHERE id = ?")
        .bind(amount)
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn add_extra_due(state: State<'_, AppState>, coop_member_id: i64, year: i32, month: i32, amount: f64) -> Result<(), String> {
    let period = format!("{:04}-{:02}-01", year, month);
    sqlx::query(
        "INSERT INTO dues (coop_member_id, period, amount, status) VALUES (?, ?, ?, 'unpaid')"
    )
    .bind(coop_member_id)
    .bind(period)
    .bind(amount)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn generate_dues(state: State<'_, AppState>, coop_member_id: i64, monthly_amount: f64) -> Result<(), String> {
    // 1. Get Cooperative Member Entry Date
    let member_entry = sqlx::query(
        "SELECT entry_date FROM cooperative_members WHERE id = ?"
    )
    .bind(coop_member_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Member not found in cooperative")?;

    // Flexible date parsing: try YYYY-MM-DD, fall back if needed
    let entry_date_str: String = member_entry.try_get("entry_date").unwrap_or_default();
    
    let start_date = chrono::NaiveDate::parse_from_str(&entry_date_str, "%Y-%m-%d")
        .map_err(|_| "Invalid date format")?;
    let now = chrono::Local::now().date_naive();
    
    // 2. Iterate months from start_date to now
    let mut current_date = start_date;
    while current_date <= now {
        let period = current_date.format("%Y-%m-%d").to_string(); // Use full date as period reference
        
        // 3. Check if due already exists
        let exists = sqlx::query(
            "SELECT id FROM dues WHERE coop_member_id = ? AND period = ?"
        )
        .bind(coop_member_id)
        .bind(&period)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

        if exists.is_none() {
            sqlx::query(
                "INSERT INTO dues (coop_member_id, period, amount, status) VALUES (?, ?, ?, 'unpaid')"
            )
            .bind(coop_member_id)
            .bind(&period)
            .bind(monthly_amount)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
        }

        // Advance 1 month
        if current_date.month() == 12 {
            current_date = current_date.with_year(current_date.year() + 1).unwrap().with_month(1).unwrap();
        } else {
            current_date = current_date.with_month(current_date.month() + 1).unwrap();
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn add_next_due(state: State<'_, AppState>, coop_member_id: i64, monthly_amount: f64) -> Result<(), String> {
    // 1. Find the latest due period
    let last_due = sqlx::query(
        "SELECT period FROM dues WHERE coop_member_id = ? ORDER BY period DESC LIMIT 1"
    )
    .bind(coop_member_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let next_date = if let Some(due) = last_due {
        // If dues exist, add 1 month to the last one
        let period_str: String = due.try_get("period").unwrap_or_default();
        let last_date = chrono::NaiveDate::parse_from_str(&period_str, "%Y-%m-%d")
            .map_err(|_| "Invalid date format in DB")?;
        
        if last_date.month() == 12 {
            last_date.with_year(last_date.year() + 1).unwrap().with_month(1).unwrap()
        } else {
            last_date.with_month(last_date.month() + 1).unwrap()
        }
    } else {
        // If no dues exist, use the member's entry date
        let member_entry = sqlx::query(
            "SELECT entry_date FROM cooperative_members WHERE id = ?"
        )
        .bind(coop_member_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Member not found")?;

        let entry_date_str: String = member_entry.try_get("entry_date").unwrap_or_default();
        chrono::NaiveDate::parse_from_str(&entry_date_str, "%Y-%m-%d")
            .map_err(|_| "Invalid entry date format")?
    };

    let period = next_date.format("%Y-%m-%d").to_string();

    // Check if distinct (though logic implies it should be new, double check to avoid dupes if race condition)
    let exists = sqlx::query(
        "SELECT id FROM dues WHERE coop_member_id = ? AND period = ?"
    )
    .bind(coop_member_id)
    .bind(&period)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    if exists.is_none() {
        sqlx::query(
            "INSERT INTO dues (coop_member_id, period, amount, status) VALUES (?, ?, ?, 'unpaid')"
        )
        .bind(coop_member_id)
        .bind(period)
        .bind(monthly_amount)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    } else {
        return Err("Bu dönem için aidat zaten mevcut.".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn get_member_dues(state: State<'_, AppState>, coop_member_id: i64) -> Result<Vec<Due>, String> {
    let dues = sqlx::query_as::<_, Due>(
        "SELECT id, coop_member_id, period, amount, paid_amount, status, payment_date 
         FROM dues 
         WHERE coop_member_id = ? 
         ORDER BY period ASC"
    )
    .bind(coop_member_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(dues)
}

#[tauri::command]
pub async fn pay_due(state: State<'_, AppState>, args: PayDueArgs) -> Result<(), String> {
    // 1. Get Due info
    let due = sqlx::query_as::<_, Due>(
        "SELECT id, coop_member_id, period, amount, paid_amount, status, payment_date FROM dues WHERE id = ?"
    )
    .bind(args.due_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Due not found")?;

    let new_paid = due.paid_amount + args.amount;
    let new_status = if new_paid >= due.amount { "paid" } else { "partial" };

    sqlx::query(
        "UPDATE dues SET paid_amount = ?, status = ?, payment_date = ? WHERE id = ?"
    )
    .bind(new_paid)
    .bind(new_status)
    .bind(args.payment_date)
    .bind(args.due_id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn add_members_to_coop(
    state: State<'_, AppState>,
    args: AddMemberToCoopArgs
) -> Result<(), String> {
    // Start a transaction
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    for member_id in args.member_ids {
        sqlx::query(
            "INSERT INTO cooperative_members (coop_id, member_id, entry_date) VALUES (?, ?, ?)"
        )
        .bind(args.coop_id)
        .bind(member_id)
        .bind(&args.entry_date)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_coop_members(state: State<'_, AppState>, coop_id: i64) -> Result<Vec<CoopMember>, String> {
    let members = sqlx::query_as::<_, CoopMember>(
        "SELECT 
            cm.id, cm.member_id, m.full_name, m.tc_number, m.phone_1, cm.entry_date
         FROM cooperative_members cm
         JOIN members m ON cm.member_id = m.id
         WHERE cm.coop_id = ?
         ORDER BY m.full_name ASC"
    )
    .bind(coop_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(members)
}

#[tauri::command]
pub async fn get_available_members(state: State<'_, AppState>, coop_id: i64) -> Result<Vec<Member>, String> {
    let members = sqlx::query_as::<_, Member>(
        "SELECT * FROM members 
         WHERE id NOT IN (SELECT member_id FROM cooperative_members WHERE coop_id = ?)
         ORDER BY full_name ASC"
    )
    .bind(coop_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(members)
}

#[tauri::command]
pub async fn get_coop_details(state: State<'_, AppState>, id: i64) -> Result<Cooperative, String> {
    let coop = sqlx::query_as::<_, Cooperative>(
        "SELECT id, name, start_date, created_at FROM cooperatives WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Cooperative not found")?;

    Ok(coop)
}

#[tauri::command]
pub async fn create_coop(
    state: State<'_, AppState>,
    coop: CreateCoopArgs
) -> Result<i64, String> {
    let result = sqlx::query(
        "INSERT INTO cooperatives (name, start_date) VALUES (?, ?)"
    )
    .bind(coop.name)
    .bind(coop.start_date)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn get_coops(state: State<'_, AppState>) -> Result<Vec<Cooperative>, String> {
    let coops = sqlx::query_as::<_, Cooperative>(
        "SELECT id, name, start_date, created_at FROM cooperatives ORDER BY start_date DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(coops)
}

#[tauri::command]
pub async fn create_member(
    state: State<'_, AppState>,
    member: CreateMemberArgs
) -> Result<i64, String> {
    let result = sqlx::query(
        "INSERT INTO members (tc_number, full_name, phone_1, phone_2, registration_date) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(member.tc_number)
    .bind(member.full_name)
    .bind(member.phone_1)
    .bind(member.phone_2)
    .bind(member.registration_date)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn get_members(state: State<'_, AppState>) -> Result<Vec<Member>, String> {
    let members = sqlx::query_as::<_, Member>(
        "SELECT id, tc_number, full_name, phone_1, phone_2, registration_date, created_at FROM members ORDER BY full_name ASC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(members)
}

#[tauri::command]
pub async fn update_member(
    state: State<'_, AppState>,
    id: i64,
    member: CreateMemberArgs
) -> Result<(), String> {
    sqlx::query(
        "UPDATE members SET tc_number=?, full_name=?, phone_1=?, phone_2=?, registration_date=? WHERE id=?"
    )
    .bind(member.tc_number)
    .bind(member.full_name)
    .bind(member.phone_1)
    .bind(member.phone_2)
    .bind(member.registration_date)
    .bind(id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn search_members(state: State<'_, AppState>, query: String) -> Result<Vec<Member>, String> {
    let pattern = format!("%{}%", query);
    let members = sqlx::query_as::<_, Member>(
        "SELECT id, tc_number, full_name, phone_1, phone_2, registration_date, created_at FROM members 
         WHERE full_name LIKE ? OR tc_number LIKE ? 
         ORDER BY full_name ASC"
    )
    .bind(&pattern)
    .bind(&pattern)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(members)
}
