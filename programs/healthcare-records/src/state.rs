use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Record {
    pub patient: Pubkey,
    pub provider: Pubkey,
    pub record_id: u64,
    pub record_hash: [u8; 32],
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Consent {
    pub patient: Pubkey,
    pub provider: Pubkey,
    pub record: Pubkey,
    pub record_id: u64,
    pub granted_at: i64,
    pub expires_at: i64,
    pub active: bool,
}
