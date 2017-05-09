'use babel';

import React from 'react';
import ReactDOM from 'react-dom';
import EventEmitter from 'events';

const noop = function() {};

class StackView extends React.Component {
    render() {
        if (this.props.thread === 'spin') {
            return <span className='loading loading-spinner-tiny inline-block'></span>;
        } else if (this.props.thread) {
            return (
                <div className="block">
                    <ul className='list-group'>
                        {this.props.thread.threadInfo.call_stack.map((stack, index) =>
                            <li
                                key={index}
                                className={(this.props.selected || 0) === index ? "list-item selected" : "list-item"}
                                onClick={this.props.onSelectFrame ? () => this.props.onSelectFrame(index) : noop}
                                title={stack.location.script_path}
                            >
                                <span>{stack.location.script_path.split('/').pop()}</span>
                                <span>:{stack.location.line_number}</span>
                                <span> {stack.location.function_name}</span>
                            </li>
                        )}
                    </ul>
                </div>
            );
        } else {
            return (<div className="block">No active thread</div>);
        }
    }
}

class VarView extends React.Component {
    constructor() {
        super();
        this.state = {opened: false, pending: false, values: null}
    }
    toggleOpened() {
        this.setState({opened: !this.state.opened});
        if (!this.state.values && this.props.thread) {
            this.setState({pending: true});
            this.props.thread.getMembers(this.props.path, this.props.selected).then(data => {
                this.setState({pending: false, values: data});
            });
        }
    }
    render() {
        var pending = '';
        if (this.state.pending) {
            pending = <span className='loading loading-spinner-tiny inline-block'></span>;
        }
        var vals = '';
        if (this.state.values && this.state.opened) {
            vals =
                (<ul className='list-tree'>
                    {this.state.values.map((value, index) =>
                        <li className="list-nested-item" key={index}>
                            <VarView
                                type={value.type}
                                value={value.value}
                                name={value.name}
                                path={this.props.path + '.' + value.name}
                                thread={this.props.thread}
                                selected={this.props.selected}
                            />
                        </li>
                    )}
                </ul>);
        }
        return (
            <div className="bart_pad_tree">
                <div className='list-item'>
                    <span className={this.props.type.includes('dw.') || this.props.type.includes('Object')  ? 'icon icon-chevron-right' : ''}
                        onClick={this.toggleOpened.bind(this)}
                    ></span>
                    <span title={this.props.type} >{this.props.name}</span>
                    <span> = {this.props.value}</span>
                </div>
                {pending} {vals}
            </div>
        )
    }
}

class VariablesView extends React.Component {
    render() {
        if (this.props.values === 'spin') {
            return <div className='b-bart_variables right'>
                <span className='loading loading-spinner-tiny inline-block'></span>
            </div>;
        } if (this.props.values) {
            return (
            <div className="b-bart_variables right">
                <ul className='list-tree'>
                    {this.props.values.map((value, key) =>
                        <li className="list-nested-item" key={key} >
                            <VarView type={value.type} value={value.value} name={value.name} path={value.name}
                                thread={this.props.thread} selected={this.props.selected}
                            />
                        </li>
                    )}
                </ul>
            </div>);
        } else {
            return (<div className="b-bart_variables right">No variables</div>);
        }
    }
}


class MainView extends React.Component {
    constructor() {
        super();
        this.state = {thread: null, selectedFrame: 0};
    }
    emit(eventName, data) {
        this.emitter.emit(eventName, data);
    }
    componentDidMount() {
        this.emitter = new EventEmitter();
    }
    on(event, fn) {
        this.emitter.on(event, fn);
    }
    onSelectFrame(frameNo) {
        this.emit('selectFrame', frameNo);
        this.setState({selectedFrame: +frameNo});
    }
    render() {
        return (
            <div className="b-bart-debugger_panel block" contentEditable="true">
                <atom-panel class="b-bart_parent_stack left">
                    <div className="inline-block btn-group">
                        <button onClick={this.emit.bind(this, 'close')} className="icon icon-remove-close btn" title="close debugger F12"></button>
                        <button onClick={this.emit.bind(this, 'stop')} className="icon icon-primitive-square btn" title="stop"></button>
                        <button onClick={this.emit.bind(this, 'resume')} className="icon icon-playback-play btn" title="resume F8"></button>
                        <button onClick={this.emit.bind(this, 'stepover')} className="icon icon-jump-right btn" title="step over F10"></button>
                        <button onClick={this.emit.bind(this, 'stepin')} className="icon icon-jump-down btn" title="step in F11"></button>
                        <button onClick={this.emit.bind(this, 'stepout')} className="icon icon-jump-up btn" title="step out SHIFT-F11"></button>
                    </div>
                    <StackView thread={this.state.thread} onSelectFrame={this.onSelectFrame.bind(this)} selected={this.state.selectedFrame}/>
                </atom-panel>
                <VariablesView values={this.state.values} thread={this.state.thread} selected={this.state.selectedFrame} />
                <div className="clearboth"/>
            </div>
            );

    }
}


export default class DebuggerView {
    constructor() {
        this.el = document.createElement('div');
        this.el.className = 'b-bart-debugger';
        this.container = document.createElement('div');

        this.el.appendChild(this.container);
        this.mainView = ReactDOM.render(<MainView />, this.container);
    }
    updateThread (maybeThread) {
        this.mainView.setState({thread: maybeThread});
    }
    updateValues (maybeValues) {
        this.mainView.setState({values: maybeValues});
    }
    on(eventName, cb) {
        this.mainView.on(eventName, cb);
    }
    getElement () {
        return this.el;
    }
    destroy() {
        React.unmountComponentAtNode(this.container);
    }
}
