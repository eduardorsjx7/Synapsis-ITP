import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';

const TableComponent = ({ data }) => {
  const columns = [
    { accessorKey: 'cliente', header: 'Cliente' },
    { accessorKey: 'descricao', header: 'Descrição' },
    { accessorKey: 'prioridade', header: 'Prioridade' },
    { accessorKey: 'nota', header: 'Nota' },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table border="1" cellPadding="8" style={{ marginTop: '2rem', width: '100%' }}>
      <thead>
        {table.getHeaderGroups().map(group => (
          <tr key={group.id}>
            {group.headers.map(header => (
              <th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TableComponent;