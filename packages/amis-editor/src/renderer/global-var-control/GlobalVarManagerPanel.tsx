import React from 'react';
import {GlobalVariableItem} from 'amis-core';
import {PanelProps, SchemaForm, EditorManager} from 'amis-editor-core';
import {observer} from 'mobx-react';
import {Alert2, Button, ConfirmBox, LazyComponent} from 'amis-ui';

type PanelComponentProps = {
  value: GlobalVariableItem;
  onChange: (value: GlobalVariableItem) => void;
};

export interface GlobalVarItemInEditor extends Omit<GlobalVariableItem, 'id'> {
  id: string | number;
}

/**
 * 全局变量管理面板
 */
export interface globalVarPanel {
  /**
   * 变量类型，不通的变量类型配置面板不一样
   */
  type: string | 'builtin';

  /**
   * 变量类型标题
   */
  title: string;

  /**
   * 变量类型描述
   */
  description?: string;

  renderBrief?: (value: GlobalVariableItem) => React.ReactNode;

  /**
   * 验证数据合法性
   * @param value
   * @returns
   */
  validate?: (value: GlobalVariableItem) => string | void;

  /**
   * 配置面板
   */
  component?: React.ComponentType<PanelComponentProps>;
  getComponent?: (
    manger: EditorManager
  ) => Promise<React.ComponentType<PanelComponentProps>>;
}

const globalVarPanels: Array<globalVarPanel> = [];

export function registerGlobalVarPanel(
  type: string,
  panel: Omit<globalVarPanel, 'type'>
) {
  globalVarPanels.push({...panel, type});
}

export interface GlobalVarMangerProps extends PanelProps {}

export const GlobalVarManger = observer((props: GlobalVarMangerProps) => {
  const {store, manager} = props;
  const [loading, setLoading] = React.useState<boolean>(false);
  const [variableItem, setVariableItem] =
    React.useState<Partial<GlobalVariableItem> | null>(null);
  const [isOpened, setIsOpened] = React.useState<boolean>(false);

  const handleAddVariable = React.useCallback(() => {
    setIsOpened(true);
    setVariableItem({});
  }, []);

  const handleModalConfirm = React.useCallback(async (value: any) => {
    const panel = globalVarPanels.find(item => item.type === value.type);
    if (!panel) {
      throw new Error('未找到对应的变量类型配置面板');
    }
    await panel.validate?.(value);

    return value;
  }, []);

  const handleModalClose = React.useCallback(() => {
    setIsOpened(false);
  }, []);

  const handleModalChange = React.useCallback((value: any) => {}, []);

  // 初始化全局变量
  React.useEffect(() => {
    setLoading(true);
    let mounted = true;
    manager.initGlobalVariables().finally(() => {
      mounted && setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const schema = React.useMemo(() => {
    const body: any[] = [];

    if (globalVarPanels.length > 1) {
      body.push({
        type: 'select',
        name: 'type',
        label: '变量类型',
        value: 'builtin',
        options: globalVarPanels.map(item => ({
          label: item.title,
          value: item.type
        }))
      });
    }

    body.push({
      children: (props: any) => {
        const type = props.data.type || 'builtin';
        const panel = globalVarPanels.find(item => item.type === type);

        if (!panel) {
          return <Alert2 level="warning">未找到对应的变量类型配置面板</Alert2>;
        }

        return panel.component ? (
          <panel.component {...props} onChange={props.onBulkChange} />
        ) : (
          <LazyComponent
            {...props}
            onChange={props.onBulkChange}
            getComponent={panel.getComponent?.bind(panel, manager)}
          />
        );
      }
    });

    return {
      type: 'form',
      mode: 'horizontal',
      horizontal: {
        left: 2
      },
      body: body,
      submitOnChange: false,
      appendSubmitBtn: false,
      actions: []
    };
  }, []);

  return (
    <div className="ae-GlobalVarManager">
      {store.globalVariables.length ? (
        <ul>
          {store.globalVariables.map((item, index) => {
            return (
              <div key={index} className="global-var-item">
                <div className="global-var-item-title">{item.label}</div>
                <div className="global-var-item-value">{item.value}</div>
              </div>
            );
          })}
        </ul>
      ) : (
        <div className="ae-GlobalVarManager-empty">暂无全局变量</div>
      )}

      <ConfirmBox
        title={variableItem?.id ? '编辑全局变量' : '新增全局变量'}
        type={'dialog'}
        size={'md'}
        onConfirm={handleModalConfirm}
        show={isOpened}
        onCancel={handleModalClose}
      >
        {
          (({bodyRef, loading, popOverContainer}: any) => (
            <SchemaForm
              {...schema}
              value={variableItem}
              onChange={handleModalChange}
              disabled={loading}
              ref={bodyRef}
              env={manager.env}
              manager={manager}
              popOverContainer={popOverContainer}
            />
          )) as any
        }
      </ConfirmBox>

      <Button
        onClick={handleAddVariable}
        className="ae-GlobalVarManager-AddBtn"
        block
        disabled={isOpened}
      >
        新增全局变量
      </Button>
    </div>
  );
});

export function GlobalVarManagerPanel(props: any) {
  return (
    <div className="ae-GlobalVarPanel">
      <div className="panel-header">全局变量</div>
      <hr className="margin-top" />
      <GlobalVarManger {...props} />
    </div>
  );
}
