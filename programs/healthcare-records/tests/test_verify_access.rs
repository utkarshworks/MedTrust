use anchor_lang::prelude::*;
use anchor_lang::InstructionData;
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::{Instruction, Transaction};
use healthcare_records::{
    self,
    constants::{CONSENT_SEED, RECORD_SEED},
};

fn setup() -> (
    LiteSVM,
    Keypair,
    Keypair,
    Pubkey,
    Pubkey,
) {
    let mut svm = LiteSVM::new();

    let patient = Keypair::new();
    let provider = Keypair::new();

    let payer_lamports = 10_000_000_000;
    svm.airdrop(&patient.pubkey(), payer_lamports).unwrap();
    svm.airdrop(&provider.pubkey(), payer_lamports).unwrap();

    let program_bytes =
        include_bytes!("../../../target/deploy/healthcare_records.so");

    svm.add_program(healthcare_records::ID, program_bytes).unwrap();

    let record_id: u64 = 1;

    let (record_pda, _) = Pubkey::find_program_address(
        &[
            RECORD_SEED,
            patient.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let create_ix = Instruction {
        program_id: healthcare_records::ID,
        accounts: vec![
            AccountMeta::new(record_pda, false),
            AccountMeta::new(patient.pubkey(), true),
            AccountMeta::new_readonly(provider.pubkey(), false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: healthcare_records::instruction::CreateRecord {
            record_id,
            record_hash: [7u8; 32],
        }
        .data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[create_ix],
        Some(&patient.pubkey()),
        &[&patient],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let clock = svm.get_sysvar::<Clock>();
    let expires_at = clock.unix_timestamp + 3_600;

    let (consent_pda, _) = Pubkey::find_program_address(
        &[
            CONSENT_SEED,
            patient.pubkey().as_ref(),
            provider.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let grant_ix = Instruction {
        program_id: healthcare_records::ID,
        accounts: vec![
            AccountMeta::new_readonly(record_pda, false),
            AccountMeta::new(consent_pda, false),
            AccountMeta::new(patient.pubkey(), true),
            AccountMeta::new_readonly(provider.pubkey(), false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: healthcare_records::instruction::GrantConsent {
            record_id,
            expires_at,
        }
        .data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[grant_ix],
        Some(&patient.pubkey()),
        &[&patient],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    (svm, patient, provider, consent_pda, record_pda)
}

#[test]
fn test_verify_access() {
    let (mut svm, _patient, provider, consent_pda, _record_pda) = setup();

    let verify_ix = Instruction {
        program_id: healthcare_records::ID,
        accounts: vec![
            AccountMeta::new_readonly(consent_pda, false),
            AccountMeta::new_readonly(provider.pubkey(), true),
        ],
        data: healthcare_records::instruction::VerifyAccess {}.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[verify_ix],
        Some(&provider.pubkey()),
        &[&provider],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();
}

#[test]
fn test_verify_access_after_revoke_fails() {
    let (mut svm, patient, provider, consent_pda, _record_pda) = setup();

    let revoke_ix = Instruction {
        program_id: healthcare_records::ID,
        accounts: vec![
            AccountMeta::new(consent_pda, false),
            AccountMeta::new_readonly(patient.pubkey(), true),
        ],
        data: healthcare_records::instruction::RevokeConsent {}.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[revoke_ix],
        Some(&patient.pubkey()),
        &[&patient],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let verify_ix = Instruction {
        program_id: healthcare_records::ID,
        accounts: vec![
            AccountMeta::new_readonly(consent_pda, false),
            AccountMeta::new_readonly(provider.pubkey(), true),
        ],
        data: healthcare_records::instruction::VerifyAccess {}.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[verify_ix],
        Some(&provider.pubkey()),
        &[&provider],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);

    assert!(result.is_err());
}

#[test]
fn test_verify_access_after_expiry_fails() {
    let mut svm = LiteSVM::new();

    let patient = Keypair::new();
    let provider = Keypair::new();

    let payer_lamports = 10_000_000_000;
    svm.airdrop(&patient.pubkey(), payer_lamports).unwrap();
    svm.airdrop(&provider.pubkey(), payer_lamports).unwrap();

    let program_bytes =
        include_bytes!("../../../target/deploy/healthcare_records.so");

    svm.add_program(healthcare_records::ID, program_bytes).unwrap();

    let record_id: u64 = 2;

    let (record_pda, _) = Pubkey::find_program_address(
        &[
            RECORD_SEED,
            patient.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let create_ix = Instruction {
        program_id: healthcare_records::ID,
        accounts: vec![
            AccountMeta::new(record_pda, false),
            AccountMeta::new(patient.pubkey(), true),
            AccountMeta::new_readonly(provider.pubkey(), false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: healthcare_records::instruction::CreateRecord {
            record_id,
            record_hash: [8u8; 32],
        }
        .data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[create_ix],
        Some(&patient.pubkey()),
        &[&patient],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let clock = svm.get_sysvar::<Clock>();
    let expires_at = clock.unix_timestamp + 1;

    let (consent_pda, _) = Pubkey::find_program_address(
        &[
            CONSENT_SEED,
            patient.pubkey().as_ref(),
            provider.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let grant_ix = Instruction {
        program_id: healthcare_records::ID,
        accounts: vec![
            AccountMeta::new_readonly(record_pda, false),
            AccountMeta::new(consent_pda, false),
            AccountMeta::new(patient.pubkey(), true),
            AccountMeta::new_readonly(provider.pubkey(), false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: healthcare_records::instruction::GrantConsent {
            record_id,
            expires_at,
        }
        .data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[grant_ix],
        Some(&patient.pubkey()),
        &[&patient],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let mut expired_clock = svm.get_sysvar::<Clock>();
    expired_clock.unix_timestamp = expires_at + 1;
    svm.set_sysvar::<Clock>(&expired_clock);

    let verify_ix = Instruction {
        program_id: healthcare_records::ID,
        accounts: vec![
            AccountMeta::new_readonly(consent_pda, false),
            AccountMeta::new_readonly(provider.pubkey(), true),
        ],
        data: healthcare_records::instruction::VerifyAccess {}.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[verify_ix],
        Some(&provider.pubkey()),
        &[&provider],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);

    assert!(result.is_err());
}

#[test]
fn test_verify_access_wrong_provider_fails() {
    let (mut svm, _patient, _provider, consent_pda, _record_pda) = setup();

    let wrong_provider = Keypair::new();

    svm.airdrop(&wrong_provider.pubkey(), 10_000_000_000)
        .unwrap();

    let verify_ix = Instruction {
        program_id: healthcare_records::ID,
        accounts: vec![
            AccountMeta::new_readonly(consent_pda, false),
            AccountMeta::new_readonly(wrong_provider.pubkey(), true),
        ],
        data: healthcare_records::instruction::VerifyAccess {}.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[verify_ix],
        Some(&wrong_provider.pubkey()),
        &[&wrong_provider],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);

    assert!(result.is_err());
}
