// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use tauri::Manager; // Fix: Import Manager trait
mod db;
mod models;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            tauri::async_runtime::block_on(async {
                let state = db::init_db(app.handle()).await.expect("failed to init db");
                app.manage(state);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::create_member,
            commands::get_members,
            commands::update_member,
            commands::search_members,
            commands::create_coop,
            commands::get_coops,
            commands::get_coop_details,
            commands::add_members_to_coop,
            commands::get_coop_members,
            commands::get_available_members,
            commands::generate_dues,
            commands::add_next_due,
            commands::get_member_dues,
            commands::pay_due,
            commands::generate_yearly_dues,
            commands::delete_due,
            commands::delete_yearly_dues,
            commands::update_due_amount,
            commands::add_extra_due,
            commands::get_payment_receipt_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
