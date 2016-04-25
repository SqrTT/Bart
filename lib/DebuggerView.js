'use babel';

import React from 'react';
import ReactDOM from 'react-dom';
import EventEmitter from 'events';

const StackView = React.createClass({
    render: function () {
        if (this.props.thread) {
            return (<div className="block">{this.props.thread.threadInfo.call_stack.map(stack =>
                <div>
                    <span>{stack.location.script_path.split('/').pop()}</span>
                    <span>:{stack.location.line_number}</span>
                    <span> {stack.location.function_name}</span>
                </div>
            )}</div>);
        } else {
            return (<div className="block">No active thread</div>);
        }
    }
});

const VariablesView = React.createClass({
    render: function () {
        if (this.props.values) {
            return (<div className="block">{this.props.values.map(value =>
                <div>
                    <span>{value.name}</span>
                    <span> : {value.type}</span>
                    <span> = {value.value}</span>
                </div>
            )}</div>);
        } else {
            return (<div className="b-bart_variables right">No variables</div>);
        }
    }
});


const MainView = React.createClass({
    getInitialState: () => {
        return {thread: null};
    },
    emit: (eventName) => {
        this.emitter.emit(eventName);
    },
    componentDidMount: () => {
        this.emitter = new EventEmitter();
    },
    on: (event, fn) => {
        this.emitter.on(event, fn);
    },
    render: function () {
        return (
            <div className="b-bart-debugger_panel block">
                <atom-panel class="b-bart_parent_stack left">
                    <div className="inline-block btn-group">
                        <button onClick={this.emit.bind(this, 'close')} className="icon icon-remove-close btn" title="close debugger"></button>
                        <button onClick={this.emit.bind(this, 'stop')} className="icon icon-primitive-square btn" title="stop"></button>
                        <button onClick={this.emit.bind(this, 'resume')} className="icon icon-playback-play btn" title="resume"></button>
                        <button onClick={this.emit.bind(this, 'stepover')} className="icon icon-jump-right btn" title="step over"></button>
                        <button onClick={this.emit.bind(this, 'stepin')} className="icon icon-jump-down btn" title="step in"></button>
                        <button onClick={this.emit.bind(this, 'stepout')} className="icon icon-jump-up btn" title="step out"></button>
                        <button onClick={this.emit.bind(this, 'update')} className="icon icon-repo-sync btn" title="manual update"></button>
                    </div>
                    <StackView thread={this.state.thread} />
                </atom-panel>
                <VariablesView values={this.state.values} />
                <div className="clearboth"/>
            </div>
            );

    }
});


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
