use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Member {
    pub id: i64,
    pub tc_number: String,
    pub full_name: String,
    pub phone_1: String,
    pub phone_2: Option<String>,
    pub registration_date: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMemberArgs {
    pub tc_number: String,
    pub full_name: String,
    pub phone_1: String,
    pub phone_2: Option<String>,
    pub registration_date: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Cooperative {
    pub id: i64,
    pub name: String,
    pub start_date: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCoopArgs {
    pub name: String,
    pub start_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddMemberToCoopArgs {
    pub coop_id: i64,
    pub member_ids: Vec<i64>,
    pub entry_date: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CoopMember {
    pub id: i64, // cooperative_members.id
    pub member_id: i64,
    pub full_name: String,
    pub tc_number: String,
    pub phone_1: String,
    pub entry_date: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Due {
    pub id: i64,
    pub coop_member_id: i64,
    pub period: String,
    pub amount: f64,
    pub paid_amount: f64,
    pub status: String,
    pub payment_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PayDueArgs {
    pub due_id: i64,
    pub amount: f64,
    pub payment_date: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ReceiptInfo {
    pub coop_name: String,
    pub member_full_name: String,
    pub member_tc: String,
    pub member_phone: String,
}
