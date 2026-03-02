import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import StatusBadge from '../../common/Badge/StatusBadge';

// Custom Node Style based on HashMicro / SAP Enterprise Look
const CustomNode = ({ data }) => {
    // Determine color based on type
    const colorMap = {
        'Quotation': '#3b82f6', // blue
        'SalesOrder': '#8b5cf6', // purple
        'JobOrder': '#f59e0b', // amber
        'DeliveryOrder': '#10b981', // green
        'Invoice': '#ef4444', // red
        'Payment': '#6366f1' // indigo
    };

    const headerColor = colorMap[data.type] || '#64748b';

    return (
        <div style={{
            background: 'white',
            border: `2px solid ${headerColor}`,
            borderRadius: '8px',
            minWidth: '220px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            overflow: 'hidden'
        }}>
            <div style={{
                background: headerColor,
                color: 'white',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>{data.type}</span>
            </div>
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>
                    {data.label}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <StatusBadge status={data.status === 'COMPLETED' || data.status === 'PAID' ? 'success' : 'default'}>
                        {data.status}
                    </StatusBadge>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {data.date ? new Date(data.date).toLocaleDateString('id-ID') : '-'}
                    </span>
                </div>

                {data.amount !== null && data.amount !== undefined && (
                    <div style={{
                        marginTop: '4px',
                        paddingTop: '8px',
                        borderTop: '1px dashed #e2e8f0',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#475569',
                        textAlign: 'right'
                    }}>
                        Rp {data.amount.toLocaleString('id-ID')}
                    </div>
                )}
            </div>
        </div>
    );
};

const nodeTypes = {
    customEntity: CustomNode,
};

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function RelationshipMap({ entityType, entityId }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!entityType || !entityId) return;

        const fetchGraph = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/traceability/document-flow/${entityType}/${entityId}`);
                if (!res.ok) {
                    // Try to read API error detail
                    let errMsg = `HTTP ${res.status}`;
                    try {
                        const errBody = await res.json();
                        errMsg = errBody.detail || errBody.message || errMsg;
                    } catch { }
                    throw new Error(errMsg);
                }

                const json = await res.json();
                if (json.status === 'success') {
                    const dagreLayout = getLayoutedElements(json.data.nodes, json.data.edges);
                    setNodes(dagreLayout.nodes);
                    setEdges(dagreLayout.edges);
                } else {
                    throw new Error(json.detail || "Format respons tidak dikenali");
                }
            } catch (err) {
                console.error("Traceability Error:", err);
                setError(err.message);
            }
            setLoading(false);
        };

        fetchGraph();
    }, [entityType, entityId]);

    // Simple layout engine to position nodes sequentially from Left to Right
    const getLayoutedElements = (rawNodes, rawEdges) => {
        const typeRanks = {
            'Quotation': 0,
            'SalesOrder': 1,
            'JobOrder': 2,
            'DeliveryOrder': 3,
            'Invoice': 4,
            'Payment': 5
        };

        const newNodes = rawNodes.map((n) => {
            const levelX = typeRanks[n.type] || 0;
            // Simple positioning logic: items of same type will stack vertically
            const peerIndex = rawNodes.filter(rn => rn.type === n.type).findIndex(rn => rn.id === n.id);

            return {
                id: n.id,
                type: 'customEntity',
                position: { x: levelX * 350, y: peerIndex * 150 },
                data: { ...n }
            };
        });

        const newEdges = rawEdges.map((e, idx) => ({
            id: `e${idx}-${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
            animated: true,
            style: { stroke: '#94a3b8', strokeWidth: 2 },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#94a3b8',
            },
        }));

        return { nodes: newNodes, edges: newEdges };
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Memetakan dokumen...</div>;
    if (error) return <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444' }}>Error: {error}</div>;

    return (
        <div style={{ width: '100%', height: '500px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
            >
                <Controls />
                <Background color="#cbd5e1" gap={16} />
                <MiniMap
                    nodeColor={(n) => {
                        if (n.data?.type === 'SalesOrder') return '#8b5cf6';
                        return '#e2e8f0';
                    }}
                />
            </ReactFlow>
        </div>
    );
}
