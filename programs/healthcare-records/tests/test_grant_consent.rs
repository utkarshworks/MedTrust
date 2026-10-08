use anchor_lang::prelude::*;
use anchor_lang::InstructionData;
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::Transaction;
use healthcare_records::{self, constants::{CONSENT_SEED, RECORD_SEED}};

#[test]
fn test_grant_consent() {
    let mut svm = LiteSVM::new();

    let payer = Keypair::new();
    let provider = Keypair::new();

    let payer_lamports = 10_000_000_000;
    svm.airdrop(&payer.pubkey(), payer_lamports).unwrap();

    let program_bytes =
        include_bytes!("../../../target/deploy/healthcare_records.so");

    svm.add_program(healthcare_records::ID, program_bytes).unwrap();

    let record_id: u64 = 1;
    let record_hash = [7u8; 32];

    let (record_pda, _) = Pubkey::find_program_address(
        &[
            RECORD_SEED,
            payer.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let create_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: healthcare_records::ID,
        accounts: healthcare_records::accounts::CreateRecord {
            record: record_pda,
            patient: payer.pubkey(),
            provider: provider.pubkey(),
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: healthcare_records::instruction::CreateRecord {
            record_id,
            record_hash,
        }
        .data(),
    };

    let recent_blockhash = svm.latest_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[create_ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    svm.send_transaction(tx).unwrap();

    let expires_at = 1_000_000;

    let (consent_pda, _) = Pubkey::find_program_address(
        &[
            CONSENT_SEED,
            payer.pubkey().as_ref(),
            provider.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let grant_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: healthcare_records::ID,
        accounts: healthcare_records::accounts::GrantConsent {
            record: record_pda,
            consent: consent_pda,
            patient: payer.pubkey(),
            provider: provider.pubkey(),
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: healthcare_records::instruction::GrantConsent {
            record_id,
            expires_at,
        }
        .data(),
    };

    let recent_blockhash = svm.latest_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[grant_ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    svm.send_transaction(tx).unwrap();

    let consent_account = svm.get_account(&consent_pda).unwrap();

    assert!(!consent_account.data.is_empty());
}

#[test]
fn test_wrong_patient_cannot_grant_consent() {
    let mut svm = LiteSVM::new();

    let patient_a = Keypair::new();
    let patient_b = Keypair::new();
    let provider = Keypair::new();

    svm.airdrop(&patient_a.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&patient_b.pubkey(), 10_000_000_000).unwrap();

    let program_bytes =
        include_bytes!("../../../target/deploy/healthcare_records.so");

    svm.add_program(healthcare_records::ID, program_bytes)
        .unwrap();

    let record_id: u64 = 1;
    let record_hash = [7u8; 32];

    // Patient A creates the record.
    let (record_pda, _) = Pubkey::find_program_address(
        &[
            RECORD_SEED,
            patient_a.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let create_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: healthcare_records::ID,
        accounts: healthcare_records::accounts::CreateRecord {
            record: record_pda,
            patient: patient_a.pubkey(),
            provider: provider.pubkey(),
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: healthcare_records::instruction::CreateRecord {
            record_id,
            record_hash,
        }
        .data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[create_ix],
        Some(&patient_a.pubkey()),
        &[&patient_a],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    // Consent PDA is derived using Patient A because the record belongs to A.
    let (consent_pda, _) = Pubkey::find_program_address(
        &[
            CONSENT_SEED,
            patient_a.pubkey().as_ref(),
            provider.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let expires_at = 1_000_000;

    // Patient B attempts to grant consent for Patient A's record.
    let grant_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: healthcare_records::ID,
        accounts: healthcare_records::accounts::GrantConsent {
            record: record_pda,
            consent: consent_pda,
            patient: patient_b.pubkey(),
            provider: provider.pubkey(),
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: healthcare_records::instruction::GrantConsent {
            record_id,
            expires_at,
        }
        .data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[grant_ix],
        Some(&patient_b.pubkey()),
        &[&patient_b],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);

    assert!(
        result.is_err(),
        "A different patient must not be able to grant consent for another patient's record"
    );

    // The consent account must not have been created.
    assert!(
        svm.get_account(&consent_pda).is_none(),
        "Unauthorized consent account must not exist"
    );
}

#[test]
fn test_grant_consent_with_invalid_expiry_fails() {
    let mut svm = LiteSVM::new();

    let patient = Keypair::new();
    let provider = Keypair::new();

    svm.airdrop(&patient.pubkey(), 10_000_000_000).unwrap();

    let program_bytes =
        include_bytes!("../../../target/deploy/healthcare_records.so");

    svm.add_program(healthcare_records::ID, program_bytes)
        .unwrap();

    let record_id: u64 = 2;
    let record_hash = [9u8; 32];

    let (record_pda, _) = Pubkey::find_program_address(
        &[
            RECORD_SEED,
            patient.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let create_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: healthcare_records::ID,
        accounts: healthcare_records::accounts::CreateRecord {
            record: record_pda,
            patient: patient.pubkey(),
            provider: provider.pubkey(),
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: healthcare_records::instruction::CreateRecord {
            record_id,
            record_hash,
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
    let expires_at = clock.unix_timestamp;

    let (consent_pda, _) = Pubkey::find_program_address(
        &[
            CONSENT_SEED,
            patient.pubkey().as_ref(),
            provider.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let grant_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: healthcare_records::ID,
        accounts: healthcare_records::accounts::GrantConsent {
            record: record_pda,
            consent: consent_pda,
            patient: patient.pubkey(),
            provider: provider.pubkey(),
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
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

    let result = svm.send_transaction(tx);

    assert!(
        result.is_err(),
        "Consent with expiry at the current timestamp must be rejected"
    );

    assert!(
        svm.get_account(&consent_pda).is_none(),
        "Invalid consent must not be created"
    );
}
