import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddAgentRegistrationFields1708251600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new registration status enum type if using PostgreSQL
    if (queryRunner.connection.driver.options.type === 'postgres') {
      await queryRunner.query(`
        CREATE TYPE agent_registration_status AS ENUM (
          'profile_pending',
          'bio_pending',
          'kyc_pending',
          'awaiting_approval',
          'approved',
          'rejected'
        );
      `);
    }

    // Add new columns to agents table
    const table = await queryRunner.getTable('agents');

    if (!table) {
      throw new Error('Table "agents" does not exist');
    }

    // Check if columns already exist before adding
    const columnsToAdd = [
      new TableColumn({
        name: 'registrationStatus',
        type:
          queryRunner.connection.driver.options.type === 'postgres'
            ? 'agent_registration_status'
            : 'varchar',
        default: "'profile_pending'",
        isNullable: false,
      }),
      new TableColumn({
        name: 'yearsOfExperience',
        type: 'integer',
        isNullable: true,
      }),
      new TableColumn({
        name: 'preferredTitle',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'specialization',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'portfolioLink',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
      new TableColumn({
        name: 'profilePicture',
        type: 'varchar',
        length: '1000',
        isNullable: true,
      }),
      new TableColumn({
        name: 'bio',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'idType',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
      new TableColumn({
        name: 'idNumber',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
      new TableColumn({
        name: 'idDocument',
        type: 'varchar',
        length: '1000',
        isNullable: true,
      }),
      new TableColumn({
        name: 'architectCert',
        type: 'varchar',
        length: '1000',
        isNullable: true,
      }),
      new TableColumn({
        name: 'bankName',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'accountNumber',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
      new TableColumn({
        name: 'accountHolderName',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'approvedAt',
        type: 'timestamp',
        isNullable: true,
      }),
      new TableColumn({
        name: 'rejectionReason',
        type: 'text',
        isNullable: true,
      }),
    ];

    for (const column of columnsToAdd) {
      const existingColumn = table.findColumnByName(column.name);
      if (!existingColumn) {
        await queryRunner.addColumn('agents', column);
      }
    }

    // Add indices
    const registrationStatusIndex = new TableIndex({
      name: 'idx_agents_registrationStatus',
      columnNames: ['registrationStatus'],
    });

    const userIdIndex = new TableIndex({
      name: 'idx_agents_userId',
      columnNames: ['userId'],
    });

    if (
      !table.indices.find((i) => i.name === 'idx_agents_registrationStatus')
    ) {
      await queryRunner.createIndex('agents', registrationStatusIndex);
    }

    if (!table.indices.find((i) => i.name === 'idx_agents_userId')) {
      await queryRunner.createIndex('agents', userIdIndex);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('agents');

    if (!table) {
      return;
    }

    // Drop indices
    const registrationStatusIndex = table.indices.find(
      (i) => i.name === 'idx_agents_registrationStatus',
    );
    if (registrationStatusIndex) {
      await queryRunner.dropIndex('agents', registrationStatusIndex);
    }

    const userIdIndex = table.indices.find(
      (i) => i.name === 'idx_agents_userId',
    );
    if (userIdIndex) {
      await queryRunner.dropIndex('agents', userIdIndex);
    }

    // Drop columns
    const columnsToDrop = [
      'registrationStatus',
      'yearsOfExperience',
      'preferredTitle',
      'specialization',
      'portfolioLink',
      'profilePicture',
      'bio',
      'idType',
      'idNumber',
      'idDocument',
      'architectCert',
      'bankName',
      'accountNumber',
      'accountHolderName',
      'approvedAt',
      'rejectionReason',
    ];

    for (const columnName of columnsToDrop) {
      const column = table.findColumnByName(columnName);
      if (column) {
        await queryRunner.dropColumn('agents', column);
      }
    }

    // Drop enum type if PostgreSQL
    if (queryRunner.connection.driver.options.type === 'postgres') {
      await queryRunner.query('DROP TYPE IF EXISTS agent_registration_status;');
    }
  }
}
