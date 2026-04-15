import { checkDeviceAttestation, checkGpsAccuracy } from '@/lib/fraud/detector';
import { describe, expect, it } from 'vitest';

describe('checkGpsAccuracy', () => {
  it('passes when accuracy is within threshold', () => {
    expect(checkGpsAccuracy(50).isFlagged).toBe(false);
  });

  it('passes when accuracy is null', () => {
    expect(checkGpsAccuracy(null).isFlagged).toBe(false);
  });

  it('flags when accuracy exceeds 100m', () => {
    const result = checkGpsAccuracy(150);
    expect(result.isFlagged).toBe(true);
    expect(result.checkName).toBe('gps_accuracy');
  });

  it('flags at boundary (101m)', () => {
    expect(checkGpsAccuracy(101).isFlagged).toBe(true);
  });

  it('passes at exact threshold (100m)', () => {
    expect(checkGpsAccuracy(100).isFlagged).toBe(false);
  });
});

describe('checkDeviceAttestation', () => {
  it('passes when signals are null', () => {
    expect(checkDeviceAttestation(null).isFlagged).toBe(false);
  });

  it('passes when signals are empty', () => {
    expect(checkDeviceAttestation({}).isFlagged).toBe(false);
  });

  it('flags mock location', () => {
    const result = checkDeviceAttestation({ is_mock_location: true });
    expect(result.isFlagged).toBe(true);
    expect(result.checkName).toBe('device_integrity');
  });

  it('flags developer settings enabled', () => {
    const result = checkDeviceAttestation({ dev_settings_enabled: true });
    expect(result.isFlagged).toBe(true);
    expect(result.checkName).toBe('device_integrity');
  });

  it('flags rooted device', () => {
    const result = checkDeviceAttestation({ rooted_device: true });
    expect(result.isFlagged).toBe(true);
    expect(result.checkName).toBe('device_integrity');
  });

  it('flags failed Play Integrity', () => {
    const result = checkDeviceAttestation({ play_integrity_pass: false });
    expect(result.isFlagged).toBe(true);
    expect(result.checkName).toBe('device_integrity');
  });

  it('flags failed OS signature', () => {
    const result = checkDeviceAttestation({ os_signature_valid: false });
    expect(result.isFlagged).toBe(true);
  });

  it('flags IMU teleportation (high speed, low variance)', () => {
    const result = checkDeviceAttestation({
      speed_kmh: 30,
      imu_variance: 0.01,
    });
    expect(result.isFlagged).toBe(true);
    expect(result.checkName).toBe('imu_teleportation');
  });

  it('passes normal IMU readings', () => {
    const result = checkDeviceAttestation({
      speed_kmh: 30,
      imu_variance: 5.0,
    });
    expect(result.isFlagged).toBe(false);
  });

  it('flags low GNSS SNR variance', () => {
    const result = checkDeviceAttestation({ gnss_snr_variance: 0.2 });
    expect(result.isFlagged).toBe(true);
    expect(result.checkName).toBe('gnss_snr_variance');
  });

  it('passes normal GNSS SNR variance', () => {
    const result = checkDeviceAttestation({ gnss_snr_variance: 5.0 });
    expect(result.isFlagged).toBe(false);
  });
});
